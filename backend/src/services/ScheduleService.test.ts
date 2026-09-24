import { describe, it, expect } from 'vitest';
import { ScheduleService } from './ScheduleService';

describe('ScheduleService', () => {
  const scheduleService = new ScheduleService();

  const reqs = [
    { id: 'r1', priority: 'must' },
    { id: 'r2', priority: 'nice' }
  ];

  const questions = [
    { id: 'q1', difficulty: 1, requirement_ids: ['r2'], category: 'behavioural' }, // nice, diff 1 (Score 1)
    { id: 'q2', difficulty: 3, requirement_ids: ['r1'], category: 'technical' },   // must, diff 3 (Score 8)
    { id: 'q3', difficulty: 2, requirement_ids: ['r1'], category: 'technical' }    // must, diff 2 (Score 7)
  ];

  it('should prioritize harder and must-have material earlier', () => {
    // 3 questions, 3 days. They should land on days 1, 2, 3 in score order.
    const result = scheduleService.allocateSchedule(questions, reqs, 3);
    
    expect(result.days.length).toBe(3);
    
    // Day 1 should have q2 (Highest score: 8)
    expect(result.days[0].question_ids).toContain('q2');
    
    // Day 2 should have q3 (Score: 7)
    expect(result.days[1].question_ids).toContain('q3');
    
    // Day 3 should have q1 (Score: 1)
    expect(result.days[2].question_ids).toContain('q1');
  });

  it('should handle 1-day schedule by putting everything on day 1', () => {
    const result = scheduleService.allocateSchedule(questions, reqs, 1);
    
    expect(result.days.length).toBe(1);
    expect(result.days[0].question_ids.length).toBe(3);
    expect(result.days[0].minutes).toBe(60); // 1*10 + 3*10 + 2*10 = 60
    expect(Number.isInteger(result.days[0].minutes)).toBe(true);
  });

  it('should handle 60-day schedule sensibly with empty review days', () => {
    const result = scheduleService.allocateSchedule(questions, reqs, 60);
    
    expect(result.days.length).toBe(60);
    
    // q2 lands early, q1 lands early-ish? 
    // The chunking Math.floor((idx/3)*60) => idx 0 lands day 0, idx 1 lands day 20, idx 2 lands day 40
    expect(result.days[0].question_ids).toContain('q2');
    expect(result.days[20].question_ids).toContain('q3');
    expect(result.days[40].question_ids).toContain('q1');
    
    // Empty days should have 'Review' focus and integer minutes
    expect(result.days[1].question_ids.length).toBe(0);
    expect(result.days[1].focus).toBe('Flashcards & Review');
    expect(result.days[1].minutes).toBe(15);
  });
});
