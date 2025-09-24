import type { DeckState } from '../types/Card';

export class DeckStorageService {
  private static readonly STORAGE_KEY = 'yugioh-deck-builder';
  private static readonly SAVED_DECKS_KEY = 'yugioh-saved-decks';

  /**
   * Save current deck to localStorage
   */
  static saveDeck(deckState: DeckState): boolean {
    try {
      const deckJson = JSON.stringify(deckState);
      localStorage.setItem(this.STORAGE_KEY, deckJson);
      return true;
    } catch (error) {
      console.error('Error saving deck to localStorage:', error);
      return false;
    }
  }

  /**
   * Load deck from localStorage
   */
  static loadDeck(): DeckState | null {
    try {
      const deckJson = localStorage.getItem(this.STORAGE_KEY);
      
      if (!deckJson) {
        return null;
      }

      const deckState = JSON.parse(deckJson) as DeckState;
      
      // Validate the loaded deck structure
      if (!deckState.mainDeck || !deckState.extraDeck || !deckState.sideDeck) {
        throw new Error('Invalid deck format in localStorage');
      }

      return deckState;
    } catch (error) {
      console.error('Error loading deck from localStorage:', error);
      return null;
    }
  }

  /**
   * Save deck with a specific name to saved decks collection
   */
  static saveNamedDeck(deckState: DeckState, name: string): boolean {
    try {
      const savedDecks = this.getSavedDecks();
      const deckToSave = { ...deckState, name };
      
      // Replace if deck with same name exists, otherwise add new
      const existingIndex = savedDecks.findIndex(deck => deck.name === name);
      
      if (existingIndex >= 0) {
        savedDecks[existingIndex] = deckToSave;
      } else {
        savedDecks.push(deckToSave);
      }

      localStorage.setItem(this.SAVED_DECKS_KEY, JSON.stringify(savedDecks));
      return true;
    } catch (error) {
      console.error('Error saving named deck:', error);
      return false;
    }
  }

  /**
   * Get all saved decks
   */
  static getSavedDecks(): DeckState[] {
    try {
      const savedDecksJson = localStorage.getItem(this.SAVED_DECKS_KEY);
      
      if (!savedDecksJson) {
        return [];
      }

      const savedDecks = JSON.parse(savedDecksJson) as DeckState[];
      return Array.isArray(savedDecks) ? savedDecks : [];
    } catch (error) {
      console.error('Error loading saved decks:', error);
      return [];
    }
  }

  /**
   * Load a specific saved deck by name
   */
  static loadSavedDeck(name: string): DeckState | null {
    const savedDecks = this.getSavedDecks();
    const deck = savedDecks.find(deck => deck.name === name);
    return deck || null;
  }

  /**
   * Delete a saved deck by name
   */
  static deleteSavedDeck(name: string): boolean {
    try {
      const savedDecks = this.getSavedDecks();
      const filteredDecks = savedDecks.filter(deck => deck.name !== name);
      
      localStorage.setItem(this.SAVED_DECKS_KEY, JSON.stringify(filteredDecks));
      return true;
    } catch (error) {
      console.error('Error deleting saved deck:', error);
      return false;
    }
  }

  /**
   * Export deck to downloadable JSON file
   */
  static exportDeckToFile(deckState: DeckState, filename?: string): void {
    try {
      const deckJson = JSON.stringify(deckState, null, 2);
      const blob = new Blob([deckJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${deckState.name || 'deck'}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting deck to file:', error);
    }
  }

  /**
   * Import deck from uploaded JSON file
   */
  static importDeckFromFile(file: File): Promise<DeckState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const deckState = JSON.parse(jsonString) as DeckState;
          
          // Validate the imported deck structure
          if (!deckState.mainDeck || !deckState.extraDeck || !deckState.sideDeck) {
            throw new Error('Invalid deck format in file');
          }

          resolve(deckState);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Clear all saved data
   */
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SAVED_DECKS_KEY);
    } catch (error) {
      console.error('Error clearing saved data:', error);
    }
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): {
    currentDeckSize: number;
    savedDecksSize: number;
    totalSize: number;
    availableSpace: number;
  } {
    try {
      const currentDeck = localStorage.getItem(this.STORAGE_KEY) || '';
      const savedDecks = localStorage.getItem(this.SAVED_DECKS_KEY) || '';
      
      const currentDeckSize = new Blob([currentDeck]).size;
      const savedDecksSize = new Blob([savedDecks]).size;
      const totalSize = currentDeckSize + savedDecksSize;
      
      // Estimate localStorage limit (usually around 5-10MB)
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const availableSpace = estimatedLimit - totalSize;
      
      return {
        currentDeckSize,
        savedDecksSize,
        totalSize,
        availableSpace
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        currentDeckSize: 0,
        savedDecksSize: 0,
        totalSize: 0,
        availableSpace: 0
      };
    }
  }
}