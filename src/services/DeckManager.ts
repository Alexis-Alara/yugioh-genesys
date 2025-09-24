import type { Card, DeckCard, DeckState, DeckTypeValue } from '../types/Card';
import { DeckType, EXTRA_DECK_TYPES } from '../types/Card';
import { GenesysService } from './GenesysService';

export class DeckManager {
  private static instance: DeckManager;
  private deck: DeckState;
  private listeners: ((deck: DeckState) => void)[] = [];

  // Deck limits
  private static readonly MAIN_DECK_LIMIT = 60;
  private static readonly EXTRA_DECK_LIMIT = 15;
  private static readonly SIDE_DECK_LIMIT = 15;
  private static readonly MAX_COPIES = 3; // Maximum copies of each card

  private constructor() {
    this.deck = {
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      name: 'Mi Deck'
    };
  }

  static getInstance(): DeckManager {
    if (!DeckManager.instance) {
      DeckManager.instance = new DeckManager();
    }
    return DeckManager.instance;
  }

  /**
   * Add a listener for deck changes
   */
  addListener(callback: (deck: DeckState) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback: (deck: DeckState) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of deck changes
   */
  private notifyListeners(): void {
    const deckWithPoints = {
      ...this.deck,
      genesysPoints: this.calculateGenesysPoints()
    };
    this.listeners.forEach(callback => callback(deckWithPoints));
  }

  /**
   * Get the current deck state
   */
  getDeckState(): DeckState {
    return { 
      ...this.deck, 
      genesysPoints: this.calculateGenesysPoints() 
    };
  }

  /**
   * Determine which deck type a card belongs to
   */
  private getCardDeckType(card: Card): DeckTypeValue {
    if (EXTRA_DECK_TYPES.includes(card.type)) {
      return DeckType.EXTRA;
    }
    return DeckType.MAIN;
  }

  /**
   * Get the appropriate deck array for a deck type
   */
  private getDeckArray(deckType: DeckTypeValue): DeckCard[] {
    switch (deckType) {
      case DeckType.MAIN:
        return this.deck.mainDeck;
      case DeckType.EXTRA:
        return this.deck.extraDeck;
      case DeckType.SIDE:
        return this.deck.sideDeck;
      default:
        return this.deck.mainDeck;
    }
  }

  /**
   * Get deck limits for each deck type
   */
  private getDeckLimit(deckType: DeckTypeValue): number {
    switch (deckType) {
      case DeckType.MAIN:
        return DeckManager.MAIN_DECK_LIMIT;
      case DeckType.EXTRA:
        return DeckManager.EXTRA_DECK_LIMIT;
      case DeckType.SIDE:
        return DeckManager.SIDE_DECK_LIMIT;
      default:
        return DeckManager.MAIN_DECK_LIMIT;
    }
  }

  /**
   * Count total cards in a deck
   */
  private getTotalCardsInDeck(deckType: DeckTypeValue): number {
    const deckArray = this.getDeckArray(deckType);
    return deckArray.reduce((total, deckCard) => total + deckCard.quantity, 0);
  }

  /**
   * Find existing card in deck
   */
  private findCardInDeck(cardId: number, deckType: DeckTypeValue): DeckCard | undefined {
    const deckArray = this.getDeckArray(deckType);
    return deckArray.find(deckCard => deckCard.card.id === cardId);
  }

  /**
   * Check if we can add more copies of a card
   */
  canAddCard(card: Card, deckType?: DeckTypeValue): {
    canAdd: boolean;
    reason?: string;
    suggestedDeckType?: DeckTypeValue;
  } {
    // Determine deck type if not specified
    const targetDeckType = deckType || this.getCardDeckType(card);
    
    // Check if card belongs to the target deck type
    if (!deckType && targetDeckType === DeckType.EXTRA && 
        !EXTRA_DECK_TYPES.includes(card.type)) {
      return {
        canAdd: false,
        reason: 'Esta carta no pertenece al Extra Deck',
        suggestedDeckType: DeckType.MAIN
      };
    }

    // Check deck limit
    const currentTotal = this.getTotalCardsInDeck(targetDeckType);
    const deckLimit = this.getDeckLimit(targetDeckType);
    
    if (currentTotal >= deckLimit) {
      return {
        canAdd: false,
        reason: `El ${targetDeckType} deck está lleno (${deckLimit} cartas máximo)`
      };
    }

    // Check card copies limit
    const existingCard = this.findCardInDeck(card.id, targetDeckType);
    const currentCopies = existingCard ? existingCard.quantity : 0;
    
    if (currentCopies >= DeckManager.MAX_COPIES) {
      return {
        canAdd: false,
        reason: `Máximo ${DeckManager.MAX_COPIES} copias permitidas`
      };
    }

    return { canAdd: true };
  }

  /**
   * Add a card to the deck
   */
  addCard(card: Card, deckType?: DeckTypeValue): boolean {
    const targetDeckType = deckType || this.getCardDeckType(card);
    const canAdd = this.canAddCard(card, targetDeckType);
    
    if (!canAdd.canAdd) {
      console.warn(`Cannot add card: ${canAdd.reason}`);
      return false;
    }

    const deckArray = this.getDeckArray(targetDeckType);
    const existingCard = this.findCardInDeck(card.id, targetDeckType);

    if (existingCard) {
      existingCard.quantity++;
    } else {
      deckArray.push({
        card: card,
        quantity: 1
      });
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Add a card to the deck by ID (for existing cards in deck)
   */
  addCardById(cardId: number, deckType: DeckTypeValue): boolean {
    const deckArray = this.getDeckArray(deckType);
    const existingCard = deckArray.find(deckCard => deckCard.card.id === cardId);
    
    if (!existingCard) {
      return false; // Card not found in deck
    }

    const canAdd = this.canAddCard(existingCard.card, deckType);
    
    if (!canAdd.canAdd) {
      console.warn(`Cannot add card: ${canAdd.reason}`);
      return false;
    }

    existingCard.quantity++;
    this.notifyListeners();
    return true;
  }

  /**
   * Remove a card from the deck
   */
  removeCard(cardId: number, deckType: DeckTypeValue, removeAll: boolean = false): boolean {
    const deckArray = this.getDeckArray(deckType);
    const cardIndex = deckArray.findIndex(deckCard => deckCard.card.id === cardId);
    
    if (cardIndex === -1) {
      return false;
    }

    if (removeAll || deckArray[cardIndex].quantity === 1) {
      deckArray.splice(cardIndex, 1);
    } else {
      deckArray[cardIndex].quantity--;
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Clear all cards from a specific deck
   */
  clearDeck(deckType: DeckTypeValue): void {
    const deckArray = this.getDeckArray(deckType);
    deckArray.length = 0;
    this.notifyListeners();
  }

  /**
   * Clear all decks
   */
  clearAllDecks(): void {
    this.deck.mainDeck.length = 0;
    this.deck.extraDeck.length = 0;
    this.deck.sideDeck.length = 0;
    this.notifyListeners();
  }

  /**
   * Calculate total Genesys points in deck
   */
  private calculateGenesysPoints(): number {
    let totalPoints = 0;
    
    const allDecks = [
      ...this.deck.mainDeck,
      ...this.deck.extraDeck,
      ...this.deck.sideDeck
    ];
    
    allDecks.forEach(deckCard => {
      const cardPoints = GenesysService.getCardPoints(deckCard.card.name);
      totalPoints += cardPoints * deckCard.quantity;
    });
    
    return totalPoints;
  }

  /**
   * Get deck statistics including Genesys points
   */
  getDeckStats(): {
    main: { count: number; limit: number };
    extra: { count: number; limit: number };
    side: { count: number; limit: number };
    totalCards: number;
    genesysPoints: number;
  } {
    return {
      main: {
        count: this.getTotalCardsInDeck(DeckType.MAIN),
        limit: DeckManager.MAIN_DECK_LIMIT
      },
      extra: {
        count: this.getTotalCardsInDeck(DeckType.EXTRA),
        limit: DeckManager.EXTRA_DECK_LIMIT
      },
      side: {
        count: this.getTotalCardsInDeck(DeckType.SIDE),
        limit: DeckManager.SIDE_DECK_LIMIT
      },
      totalCards: this.getTotalCardsInDeck(DeckType.MAIN) + 
                 this.getTotalCardsInDeck(DeckType.EXTRA) + 
                 this.getTotalCardsInDeck(DeckType.SIDE),
      genesysPoints: this.calculateGenesysPoints()
    };
  }

  /**
   * Set deck name
   */
  setDeckName(name: string): void {
    this.deck.name = name;
    this.notifyListeners();
  }

  /**
   * Load deck from state
   */
  loadDeck(deckState: DeckState): void {
    this.deck = { ...deckState };
    this.notifyListeners();
  }

  /**
   * Export deck to JSON
   */
  exportDeck(): string {
    return JSON.stringify(this.deck, null, 2);
  }

  /**
   * Import deck from JSON
   */
  importDeck(jsonString: string): boolean {
    try {
      const deckState = JSON.parse(jsonString) as DeckState;
      
      // Validate the imported deck structure
      if (!deckState.mainDeck || !deckState.extraDeck || !deckState.sideDeck) {
        throw new Error('Invalid deck format');
      }

      this.loadDeck(deckState);
      return true;
    } catch (error) {
      console.error('Error importing deck:', error);
      return false;
    }
  }
}