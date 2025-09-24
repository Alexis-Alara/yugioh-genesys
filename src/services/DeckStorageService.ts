import type { DeckState, DeckCard } from '../types/Card';
import { YugiohApiService } from './YugiohApiService';


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
   * Export deck to downloadable YDK file
   */
  static exportDeckToFile(deckState: DeckState, filename?: string): void {
    try {
      const ydkContent = this.buildYdkContent(deckState);
      const blob = new Blob([ydkContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const safeName = this.sanitizeFilename(filename || deckState.name || 'deck');
      link.download = `${safeName}.ydk`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting deck to file:', error);
    }
  }

  /**
   * Import deck from uploaded YDK file
   */
  static importDeckFromFile(file: File): Promise<DeckState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const fileContent = (event.target?.result as string) ?? '';
          const deckState = await this.parseYdkContent(fileContent);
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

  private static buildYdkContent(deckState: DeckState): string {
    const lines: string[] = [];
    const deckName = deckState.name?.trim() || 'Yu-Gi-Oh! Genesys Deck';

    lines.push(`#created by ${deckName}`);
    lines.push('#main');
    lines.push(...this.serializeDeckSection(deckState.mainDeck));
    lines.push('#extra');
    lines.push(...this.serializeDeckSection(deckState.extraDeck));
    lines.push('!side');
    lines.push(...this.serializeDeckSection(deckState.sideDeck));

    return `${lines.join('\n').trimEnd()}\n`;
  }

  private static serializeDeckSection(section: DeckCard[]): string[] {
    const ids: string[] = [];

    section.forEach((deckCard) => {
      const cardId = deckCard.card?.id;
      if (!cardId) {
        return;
      }

      for (let i = 0; i < deckCard.quantity; i += 1) {
        ids.push(cardId.toString());
      }
    });

    return ids;
  }

  private static sanitizeFilename(name: string): string {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .trim();

    const simplified = normalized.replace(/\s+/g, '-').replace(/-+/g, '-');
    return simplified.replace(/^[-_]+|[-_]+$/g, '') || 'deck';
  }

  private static async parseYdkContent(content: string): Promise<DeckState> {
    const lines = content.split(/\r?\n/);
    const mainIds: number[] = [];
    const extraIds: number[] = [];
    const sideIds: number[] = [];
    let currentSection: 'main' | 'extra' | 'side' = 'main';
    let deckName: string | undefined;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      if (line.startsWith('#')) {
        const lower = line.toLowerCase();

        if (lower.startsWith('#created by')) {
          deckName = line.substring(11).trim() || undefined;
        } else if (lower.startsWith('#main')) {
          currentSection = 'main';
        } else if (lower.startsWith('#extra')) {
          currentSection = 'extra';
        }

        continue;
      }

      if (line.startsWith('!')) {
        const lower = line.toLowerCase();

        if (lower.startsWith('!side')) {
          currentSection = 'side';
        }

        continue;
      }

      const cardId = Number.parseInt(line, 10);
      if (Number.isNaN(cardId)) {
        continue;
      }

      switch (currentSection) {
        case 'extra':
          extraIds.push(cardId);
          break;
        case 'side':
          sideIds.push(cardId);
          break;
        case 'main':
        default:
          mainIds.push(cardId);
          break;
      }
    }

    const [mainDeck, extraDeck, sideDeck] = await Promise.all([
      this.buildDeckSectionFromIds(mainIds),
      this.buildDeckSectionFromIds(extraIds),
      this.buildDeckSectionFromIds(sideIds)
    ]);

    return {
      mainDeck,
      extraDeck,
      sideDeck,
      name: deckName || 'Imported Deck'
    };
  }

  private static async buildDeckSectionFromIds(ids: number[]): Promise<DeckCard[]> {
    const counts = new Map<number, number>();
    const order: number[] = [];

    ids.forEach((id) => {
      if (!counts.has(id)) {
        order.push(id);
      }

      counts.set(id, (counts.get(id) || 0) + 1);
    });

    const deckCards: DeckCard[] = [];

    for (const id of order) {
      const card = await YugiohApiService.getCardById(id);

      if (!card) {
        throw new Error(`Card with ID ${id} could not be found while importing the deck.`);
      }

      deckCards.push({
        card,
        quantity: counts.get(id) || 0
      });
    }

    return deckCards;
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
