export class ScheduleService {
  /**
   * Deterministically allocates questions across the requested days.
   */
  allocateSchedule(questions: any[], requirements: any[], daysAvailable: number) {
    if (daysAvailable <= 0) daysAvailable = 1;

    // Map requirement priorities for fast lookup
    const reqPriorityMap = new Map<string, string>();
    for (const r of requirements) {
      reqPriorityMap.set(r.id, r.priority);
    }

    // Score questions: higher is harder/more important
    const scoredQuestions = questions.map(q => {
      let isMust = false;
      if (Array.isArray(q.requirement_ids)) {
        for (const reqId of q.requirement_ids) {
          if (reqPriorityMap.get(reqId) === 'must') {
            isMust = true;
            break;
          }
        }
      }
      
      const difficulty = q.difficulty || 1;
      const score = difficulty + (isMust ? 5 : 0); // Prioritize 'must-have' heavily
      return { ...q, score };
    });

    // Sort descending by score (harder and must-have first)
    scoredQuestions.sort((a, b) => b.score - a.score);

    const days = Array.from({ length: daysAvailable }, (_, i) => ({
      day: i + 1,
      focus: '',
      question_ids: [] as string[],
      minutes: 0,
      categories: {} as Record<string, number> // internal tracking
    }));

    // Distribute questions. 
    // If questions >= days, we distribute evenly.
    // If questions < days, some days will have 0 questions, so we pad them with "Review" focus.
    scoredQuestions.forEach((q, idx) => {
      // Round robin to distribute heavily weighted questions front-to-back
      // Actually, we want harder material earlier, not evenly spread? 
      // "Harder and higher-priority material lands earlier, not the night before"
      
      // We divide the sorted questions into chunks.
      const dayIndex = Math.min(Math.floor((idx / scoredQuestions.length) * daysAvailable), daysAvailable - 1);
      
      days[dayIndex].question_ids.push(q.id);
      days[dayIndex].minutes += (q.difficulty * 10); // e.g. 10 mins per difficulty point
      
      const cat = q.category || 'mixed';
      days[dayIndex].categories[cat] = (days[dayIndex].categories[cat] || 0) + 1;
    });

    // Finalize days (focus and ensure minutes > 0)
    for (const d of days) {
      if (d.question_ids.length > 0) {
        // Find dominant category for focus
        let maxCat = '';
        let maxCount = -1;
        for (const [cat, count] of Object.entries(d.categories)) {
          if (count > maxCount) {
            maxCount = count;
            maxCat = cat;
          }
        }
        d.focus = maxCat.charAt(0).toUpperCase() + maxCat.slice(1) + ' Deep Dive';
      } else {
        d.focus = 'Flashcards & Review';
        d.minutes = 15; // default integer minutes for an empty review day
      }
      delete (d as any).categories;
    }

    return {
      days_available: daysAvailable,
      days
    };
  }
}
