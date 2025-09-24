import './style.css';
import { DeckManager } from './services/DeckManager';
import { DeckStorageService } from './services/DeckStorageService';
import { CardSearchUI } from './components/CardSearchUI';
import { DeckDisplayUI } from './components/DeckDisplayUI';
import type { Card, DeckTypeValue } from './types/Card';

class YugiohDeckBuilderApp {
  private deckManager: DeckManager;
  private cardSearchUI: CardSearchUI;
  private deckDisplayUI: DeckDisplayUI;

  constructor() {
    this.deckManager = DeckManager.getInstance();
    
    // Initialize UI components
    this.cardSearchUI = new CardSearchUI(
      'card-search',
      'search-btn', 
      'search-results',
      (card: Card) => this.handleCardSelect(card)
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

    this.initializeApp();
  }

  private initializeApp(): void {
    // Load saved deck if exists
    const savedDeck = DeckStorageService.loadDeck();
    if (savedDeck) {
      this.deckManager.loadDeck(savedDeck);
    }

    // Set up deck manager listener
    this.deckManager.addListener((deckState) => {
      this.deckDisplayUI.updateDeckDisplay(deckState);
      this.deckDisplayUI.updateGenesysPointsDisplay(this.deckManager);
      // Auto-save deck changes
      DeckStorageService.saveDeck(deckState);
    });

    // Initialize UI event listeners
    this.setupEventListeners();

    // Initialize card actions and load random cards
    this.cardSearchUI.initializeCardActions();
    this.cardSearchUI.loadRandomCards();

    // Initial display update
    this.deckDisplayUI.updateDeckDisplay(this.deckManager.getDeckState());
    this.deckDisplayUI.updateGenesysPointsDisplay(this.deckManager);
  }

  private setupEventListeners(): void {
    // Deck action buttons
    const saveDeckBtn = document.getElementById('save-deck') as HTMLButtonElement;
    const loadDeckBtn = document.getElementById('load-deck') as HTMLButtonElement;
    const clearDeckBtn = document.getElementById('clear-deck') as HTMLButtonElement;

    saveDeckBtn?.addEventListener('click', () => this.handleSaveDeck());
    loadDeckBtn?.addEventListener('click', () => this.handleLoadDeck());
    clearDeckBtn?.addEventListener('click', () => this.handleClearDeck());
  }

  private handleCardSelect(card: Card): void {
    const canAdd = this.deckManager.canAddCard(card);
    
    if (canAdd.canAdd) {
      const success = this.deckManager.addCard(card);
      if (success) {
        this.showMessage(`Carta "${card.name}" agregada al deck.`, 'success');
      }
    } else {
      // Try to add to suggested deck type if available
      if (canAdd.suggestedDeckType) {
        const canAddToSuggested = this.deckManager.canAddCard(card, canAdd.suggestedDeckType);
        if (canAddToSuggested.canAdd) {
          const success = this.deckManager.addCard(card, canAdd.suggestedDeckType);
          if (success) {
            this.showMessage(`Carta "${card.name}" agregada al ${canAdd.suggestedDeckType} deck.`, 'success');
            return;
          }
        }
      }
      
      this.showMessage(canAdd.reason || 'No se pudo agregar la carta.', 'error');
    }
  }

  private handleAddCard(cardId: number, deckType: DeckTypeValue): void {
    const success = this.deckManager.addCardById(cardId, deckType);
    if (success) {
      this.showMessage(`Carta agregada al deck.`, 'success');
    }
  }

  private handleRemoveCard(cardId: number, deckType: DeckTypeValue, removeAll: boolean): void {
    const success = this.deckManager.removeCard(cardId, deckType, removeAll);
    if (success) {
      const action = removeAll ? 'removidas' : 'removida';
      this.showMessage(`Carta(s) ${action} del deck.`, 'success');
    }
  }

  private handleSaveDeck(): void {
    const deckName = prompt('Ingresa un nombre para tu deck:', this.deckManager.getDeckState().name || 'Mi Deck');
    
    if (deckName && deckName.trim()) {
      this.deckManager.setDeckName(deckName.trim());
      const success = DeckStorageService.saveNamedDeck(this.deckManager.getDeckState(), deckName.trim());
      
      if (success) {
        this.showMessage(`Deck "${deckName}" guardado exitosamente.`, 'success');
        DeckStorageService.exportDeckToFile(this.deckManager.getDeckState(), deckName);
      } else {
        this.showMessage('Error al guardar el deck.', 'error');
      }
    }
  }

  private handleLoadDeck(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      
      if (file) {
        try {
          const deckState = await DeckStorageService.importDeckFromFile(file);
          this.deckManager.loadDeck(deckState);
          this.showMessage(`Deck "${deckState.name || 'Importado'}" cargado exitosamente.`, 'success');
        } catch (error) {
          console.error('Error loading deck:', error);
          this.showMessage('Error al cargar el deck. Verifica el formato del archivo.', 'error');
        }
      }
    });
    
    input.click();
  }

  private handleClearDeck(): void {
    if (confirm('¿Estás seguro de que quieres limpiar todo el deck? Esta acción no se puede deshacer.')) {
      this.deckManager.clearAllDecks();
      this.showMessage('Deck limpiado completamente.', 'success');
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    // Add to page
    document.body.appendChild(messageElement);
    
    // Animate in
    setTimeout(() => messageElement.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      messageElement.classList.remove('show');
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new YugiohDeckBuilderApp();
});
