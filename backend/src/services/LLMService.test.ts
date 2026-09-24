import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { LLMService } from './LLMService';

const { mockGenerateContent } = vi.hoisted(() => {
  return { mockGenerateContent: vi.fn() };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent
        };
      }
    }
  };
});

describe('LLMService', () => {
  let llmService: LLMService;
  const dummySchema = z.object({ success: z.boolean() });
  
  beforeEach(() => {
    // Reset mocks and disable MOCK_LLM for these specific tests
    vi.resetAllMocks();
    process.env.MOCK_LLM = 'false';
    // We must reset the module or re-instantiate it, but the semaphore is global.
    // We will just test the instance logic.
    llmService = new LLMService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should enforce concurrency limits', async () => {
    // Mock generateContent to take some time, allowing us to test concurrency
    mockGenerateContent.mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100));
      return { response: { text: () => JSON.stringify({ success: true }) } };
    });

    let activeRequests = 0;
    let maxActiveRequests = 0;

    // Wrap the mock to track active requests
    const originalMock = mockGenerateContent.getMockImplementation();
    mockGenerateContent.mockImplementation(async (...args: any[]) => {
      activeRequests++;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      const res = await originalMock!(...args);
      activeRequests--;
      return res;
    });

    // Fire 5 requests simultaneously
    const promises = Array(5).fill(0).map((_, i) => 
      llmService.generateStructured(`Prompt ${i}`, dummySchema, 1)
    );

    const results = await Promise.all(promises);

    expect(results.length).toBe(5);
    // Since LLM_MAX_CONCURRENCY defaults to 2 (from the module scope fallback if not in env)
    // The max active requests in the mock should not exceed 2.
    // Wait, process.env.LLM_MAX_CONCURRENCY might be undefined in vitest, defaulting to 2.
    expect(maxActiveRequests).toBeLessThanOrEqual(2);
  });

  it('should fail fast on permanent 403 error', async () => {
    mockGenerateContent.mockRejectedValue({
      status: 403,
      message: 'Forbidden'
    });

    await expect(llmService.generateStructured('Test', dummySchema, 3)).rejects.toThrow(/Permanent error 403/);
    
    // It should only try once and not retry 3 times
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 and respect Retry-After or jitter backoff', async () => {
    // First 2 calls fail with 429, 3rd succeeds
    mockGenerateContent
      .mockRejectedValueOnce({
        status: 429,
        response: { headers: { 'retry-after': '1' } },
        message: 'Rate limit'
      })
      .mockRejectedValueOnce({
        status: 429,
        message: 'Rate limit'
      })
      .mockResolvedValueOnce({
        response: { text: () => JSON.stringify({ success: true }) }
      });

    // Mock sleep to be instantaneous in tests but spy on it
    const sleepSpy = vi.spyOn(llmService as any, 'sleep').mockResolvedValue(undefined);

    const result = await llmService.generateStructured('Test', dummySchema, 5);

    expect(result).toEqual({ success: true });
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    
    // Check sleep arguments
    expect(sleepSpy).toHaveBeenCalledTimes(2);
    
    // First sleep should be roughly 1000ms + jitter because of Retry-After
    const firstSleep = sleepSpy.mock.calls[0][0];
    expect(firstSleep).toBeGreaterThanOrEqual(1000);
    expect(firstSleep).toBeLessThan(3000); // 1000 + up to 2000 jitter

    // Second sleep should be exponential backoff (attempt 2 * 8000) + jitter
    const secondSleep = sleepSpy.mock.calls[1][0];
    expect(secondSleep).toBeGreaterThanOrEqual(16000);
    expect(secondSleep).toBeLessThan(18000); // 16000 + up to 2000 jitter
  });
});
