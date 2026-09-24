export class BuilderService {
  /**
   * Merges a newly generated array of items (questions or flashcards) into an existing array,
   * preserving any item marked as 'EDITED' or 'USER_CREATED', and replacing 'GENERATED'.
   * 
   * If a specific category is provided, only that category's 'GENERATED' items are discarded.
   */
  mergeSection(existingItems: any[], newGeneratedItems: any[], targetCategory?: string): any[] {
    const retainedItems = existingItems.filter(item => {
      // If we are regenerating a specific category, keep all items from OTHER categories
      if (targetCategory && item.category !== targetCategory) {
        return true;
      }

      // Within the target category (or globally), KEEP edited and user-created items.
      const origin = item.origin || 'GENERATED'; // Default to generated for backwards compatibility
      if (origin === 'EDITED' || origin === 'USER_CREATED') {
        return true;
      }

      // Discard 'GENERATED' items in the target section
      return false;
    });

    // Ensure new items are marked as GENERATED
    const newItemsWithOrigin = newGeneratedItems.map(item => ({
      ...item,
      origin: 'GENERATED'
    }));

    // Combine and return
    return [...retainedItems, ...newItemsWithOrigin];
  }
}
