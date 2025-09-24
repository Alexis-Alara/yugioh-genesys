import './style.css';
import { DeckManager } from './services/DeckManager';
import { DeckStorageService } from './services/DeckStorageService';
import { CardSearchUI } from './components/CardSearchUI';
import { DeckDisplayUI } from './components/DeckDisplayUI';
import { CardHoverPreview } from './components/CardPreviewOverlay';
import type { Card, DeckState, DeckTypeValue } from './types/Card';

class YugiohDeckBuilderApp {
  private deckManager: DeckManager;
  private cardSearchUI: CardSearchUI;
  private deckDisplayUI: DeckDisplayUI;
  private deckNameInput: HTMLInputElement | null;

  constructor() {
    this.deckManager = DeckManager.getInstance();
    new CardHoverPreview();

    this.cardSearchUI = new CardSearchUI(
      'card-search',
      'filter-type',
      'filter-attribute',
      'filter-level',
      'search-results',
      (card: Card) => this.handleCardSelect(card),
      'filters-toggle-btn',
      'search-filters',
      'filters-clear-btn'
    );

    this.deckDisplayUI = new DeckDisplayUI(
      'main-deck',
      'extra-deck',
      'side-deck',
      'main-count',
      'extra-count',
      'side-count',
      (cardId: number, deckType: DeckTypeValue, removeAll: boolean) =>
        this.handleRemoveCard(cardId, deckType, removeAll),
      (cardId: number, deckType: DeckTypeValue) =>
        this.handleAddCard(cardId, deckType)
    );

    this.deckNameInput = document.getElementById('deck-name-input') as HTMLInputElement | null;

    this.initializeApp();
  }

  private initializeApp(): void {
    const savedDeck = DeckStorageService.loadDeck();
    if (savedDeck) {
      this.deckManager.loadDeck(savedDeck);
    }

    this.deckManager.addListener((deckState) => {
      this.deckDisplayUI.updateDeckDisplay(deckState);
      this.deckDisplayUI.updateGenesysPointsDisplay(this.deckManager);
      this.syncDeckName(deckState);
      DeckStorageService.saveDeck(deckState);
    });

    this.setupEventListeners();
    this.setupDeckNameListener();

    this.cardSearchUI.initializeCardActions();
    this.cardSearchUI.loadRandomCards();

    const deckState = this.deckManager.getDeckState();
    this.deckDisplayUI.updateDeckDisplay(deckState);
    this.deckDisplayUI.updateGenesysPointsDisplay(this.deckManager);
    this.syncDeckName(deckState);
  }

  private setupEventListeners(): void {
    const newDeckBtn = document.getElementById('new-deck') as HTMLButtonElement | null;
    const saveDeckBtn = document.getElementById('save-deck') as HTMLButtonElement | null;
    const importDeckBtn = document.getElementById('import-deck') as HTMLButtonElement | null;
    const exportDeckBtn = document.getElementById('export-deck') as HTMLButtonElement | null;

    newDeckBtn?.addEventListener('click', () => this.handleNewDeck());
    saveDeckBtn?.addEventListener('click', () => this.handleSaveDeck());
    importDeckBtn?.addEventListener('click', () => this.handleImportDeck());
    exportDeckBtn?.addEventListener('click', () => this.handleExportDeck());
  }

  private setupDeckNameListener(): void {
    if (!this.deckNameInput) {
      return;
    }

    const commitDeckName = () => {
      if (!this.deckNameInput) {
        return;
      }

      const value = this.deckNameInput.value.trim();
      const normalizedName = value || 'My Deck';
      this.deckManager.setDeckName(normalizedName);
    };

    this.deckNameInput.addEventListener('blur', commitDeckName);
    this.deckNameInput.addEventListener('change', commitDeckName);
    this.deckNameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.deckNameInput?.blur();
      }
    });
  }

  private syncDeckName(deckState: DeckState): void {
    if (!this.deckNameInput) {
      return;
    }

    const deckName = deckState.name && deckState.name.trim() ? deckState.name : 'My Deck';
    if (document.activeElement !== this.deckNameInput) {
      this.deckNameInput.value = deckName;
    }
  }

  private handleCardSelect(card: Card): void {
    const canAdd = this.deckManager.canAddCard(card);

    if (canAdd.canAdd) {
      const success = this.deckManager.addCard(card);
      if (success) {
        this.showMessage(`Added "${card.name}" to the deck.`, 'success');
      }
      return;
    }

    if (canAdd.suggestedDeckType) {
      const canAddToSuggested = this.deckManager.canAddCard(card, canAdd.suggestedDeckType);
      if (canAddToSuggested.canAdd) {
        const success = this.deckManager.addCard(card, canAdd.suggestedDeckType);
        if (success) {
          this.showMessage(
            `Added "${card.name}" to the ${canAdd.suggestedDeckType} deck.`,
            'success'
          );
          return;
        }
      }
    }

    this.showMessage(canAdd.reason || 'Card could not be added.', 'error');
  }

  private handleAddCard(cardId: number, deckType: DeckTypeValue): void {
    const success = this.deckManager.addCardById(cardId, deckType);
    if (success) {
      this.showMessage('Card added to the deck.', 'success');
    }
  }

  private handleRemoveCard(cardId: number, deckType: DeckTypeValue, removeAll: boolean): void {
    const success = this.deckManager.removeCard(cardId, deckType, removeAll);
    if (success) {
      const removedLabel = removeAll ? 'Cards removed from the deck.' : 'Card removed from the deck.';
      this.showMessage(removedLabel, 'info');
    }
  }

  private handleSaveDeck(): void {
    const deckState = this.deckManager.getDeckState();
    const deckName = deckState.name && deckState.name.trim() ? deckState.name.trim() : 'My Deck';

    const saved = DeckStorageService.saveNamedDeck(deckState, deckName);
    if (saved) {
      this.showMessage(`Deck "${deckName}" saved locally.`, 'success');
    } else {
      this.showMessage('Unable to save the deck.', 'error');
    }
  }

  private handleImportDeck(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ydk';

    input.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        try {
          const deckState = await DeckStorageService.importDeckFromFile(file);
          this.deckManager.loadDeck(deckState);
          this.showMessage(
            `Deck "${deckState.name || 'Imported'}" loaded from YDK file successfully.`,
            'success'
          );
        } catch (error) {
          console.error('Error loading deck:', error);
          this.showMessage('Deck import failed. Check the selected file.', 'error');
        }
      }
    });

    input.click();
  }

  private handleExportDeck(): void {
    const deckState = this.deckManager.getDeckState();
    const deckName = deckState.name && deckState.name.trim() ? deckState.name.trim() : 'My Deck';

    DeckStorageService.exportDeckToFile(deckState, deckName);
    this.showMessage(`Deck "${deckName}" exported as .ydk file.`, 'success');
  }

  private handleNewDeck(): void {
    const confirmation = confirm(
      'Reset the entire deck? This action cannot be undone.'
    );

    if (confirmation) {
      this.deckManager.clearAllDecks();
      this.deckManager.setDeckName('My Deck');
      this.showMessage('Deck reset completed.', 'info');
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const messageElement = document.createElement('div');
    messageElement.className = `toast toast-${type}`;
    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    requestAnimationFrame(() => {
      messageElement.classList.add('is-visible');
    });

    setTimeout(() => {
      messageElement.classList.remove('is-visible');
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 300);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new YugiohDeckBuilderApp();
});
