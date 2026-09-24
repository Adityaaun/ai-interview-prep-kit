import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useKitStore } from './kitStore';

// Mock the API so tests don't actually make network calls
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  }
}));

describe('KitStore', () => {
  beforeEach(() => {
    useKitStore.setState({
      kits: [],
      currentKit: null,
      loading: false,
    });
  });

  it('updates a question and changes origin to EDITED', () => {
    const kit = {
      id: 'k1',
      questions: [
        { id: 'q1', prompt: 'Original', origin: 'GENERATED' }
      ]
    };
    useKitStore.setState({ currentKit: kit as any });
    
    // Simulate updating a question optimistically
    const { setCurrentKitOptimistic } = useKitStore.getState();
    setCurrentKitOptimistic(draft => {
      const q = draft.questions.find((x: any) => x.id === 'q1');
      if (q) {
        q.prompt = 'Modified';
        q.origin = 'EDITED';
      }
      return draft;
    });

    const updatedKit = useKitStore.getState().currentKit;
    expect(updatedKit?.questions[0].prompt).toBe('Modified');
    expect(updatedKit?.questions[0].origin).toBe('EDITED');
  });

  it('adds a new question with USER_CREATED origin', () => {
    const kit = {
      id: 'k1',
      questions: []
    };
    useKitStore.setState({ currentKit: kit as any });
    
    const { setCurrentKitOptimistic } = useKitStore.getState();
    setCurrentKitOptimistic(draft => {
      draft.questions.push({
        id: 'qnew',
        prompt: 'New Question',
        origin: 'USER_CREATED',
        category: 'technical'
      });
      return draft;
    });

    const updatedKit = useKitStore.getState().currentKit;
    expect(updatedKit?.questions.length).toBe(1);
    expect(updatedKit?.questions[0].origin).toBe('USER_CREATED');
  });
});
