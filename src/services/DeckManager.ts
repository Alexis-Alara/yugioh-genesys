import type { Card, DeckCard, DeckState, DeckTypeValue } from '../types/Card';
import { DeckType, EXTRA_DECK_TYPES } from '../types/Card';
import { GenesysService } from './GenesysService';

export class DeckManager {
  private static instance: DeckManager;
  private deck: DeckState;
  private listeners: ((deck: DeckState) => void)[] = [];

  private static readonly MAIN_DECK_LIMIT = 60;
  private static readonly EXTRA_DECK_LIMIT = 15;
  private static readonly SIDE_DECK_LIMIT = 15;
  private static readonly MAX_COPIES = 3;

  private constructor() {
    this.deck = {
      mainDeck: [],
      extraDeck: [],
      sideDeck: [],
      name: 'My Deck'
    };
  }

  static getInstance(): DeckManager {
    if (!DeckManager.instance) {
      DeckManager.instance = new DeckManager();
    }
    return DeckManager.instance;
  }

  addListener(callback: (deck: DeckState) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (deck: DeckState) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    const deckWithPoints = {
      ...this.deck,
      genesysPoints: this.calculateGenesysPoints()
    };
    this.listeners.forEach((callback) => callback(deckWithPoints));
  }

  getDeckState(): DeckState {
    return {
      ...this.deck,
      genesysPoints: this.calculateGenesysPoints()
    };
  }

  private getCardDeckType(card: Card): DeckTypeValue {
    if (EXTRA_DECK_TYPES.includes(card.type)) {
      return DeckType.EXTRA;
    }
    return DeckType.MAIN;
  }

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

  private getTotalCardsInDeck(deckType: DeckTypeValue): number {
    const deckArray = this.getDeckArray(deckType);
    return deckArray.reduce((total, deckCard) => total + deckCard.quantity, 0);
  }

  private findCardInDeck(cardId: number, deckType: DeckTypeValue): DeckCard | undefined {
    const deckArray = this.getDeckArray(deckType);
    return deckArray.find((deckCard) => deckCard.card.id === cardId);
  }

  canAddCard(card: Card, overrideDeckType?: DeckTypeValue): { canAdd: boolean; reason?: string; suggestedDeckType?: DeckTypeValue } {
    const deckType = overrideDeckType || this.getCardDeckType(card);
    const deckArray = this.getDeckArray(deckType);
    const deckLimit = this.getDeckLimit(deckType);

    if (this.getTotalCardsInDeck(deckType) >= deckLimit) {
      return {
        canAdd: false,
        reason: `${deckType} deck is full (${deckLimit}).`
      };
    }

    const existingCard = deckArray.find((deckCard) => deckCard.card.id === card.id);
    if (existingCard && existingCard.quantity >= DeckManager.MAX_COPIES) {
      return {
        canAdd: false,
        reason: 'Maximum copies reached for this card.'
      };
    }

    if (!overrideDeckType && deckType === DeckType.MAIN && EXTRA_DECK_TYPES.includes(card.type)) {
      return {
        canAdd: false,
        reason: 'This card belongs to the Extra Deck.',
        suggestedDeckType: DeckType.EXTRA
      };
    }

    return { canAdd: true };
  }

  addCard(card: Card, deckType?: DeckTypeValue): boolean {
    const targetDeck = deckType || this.getCardDeckType(card);
    const deckArray = this.getDeckArray(targetDeck);

    const validation = this.canAddCard(card, targetDeck);
    if (!validation.canAdd) {
      return false;
    }

    const existingCard = this.findCardInDeck(card.id, targetDeck);

    if (existingCard) {
      existingCard.quantity += 1;
    } else {
      deckArray.push({ card, quantity: 1 });
    }

    this.notifyListeners();
    return true;
  }

  addCardById(cardId: number, deckType: DeckTypeValue): boolean {
    const allDecks = [
      ...this.deck.mainDeck,
      ...this.deck.extraDeck,
      ...this.deck.sideDeck
    ];

    const deckCard = allDecks.find((item) => item.card.id === cardId);

    if (!deckCard) {
      return false;
    }

    return this.addCard(deckCard.card, deckType);
  }

  removeCard(cardId: number, deckType: DeckTypeValue, removeAll: boolean): boolean {
    const deckArray = this.getDeckArray(deckType);

    const cardIndex = deckArray.findIndex((deckCard) => deckCard.card.id === cardId);

    if (cardIndex === -1) {
      return false;
    }

    if (removeAll || deckArray[cardIndex].quantity === 1) {
      deckArray.splice(cardIndex, 1);
    } else {
      deckArray[cardIndex].quantity -= 1;
    }

    this.notifyListeners();
    return true;
  }

  clearDeck(deckType: DeckTypeValue): void {
    const deckArray = this.getDeckArray(deckType);
    deckArray.length = 0;
    this.notifyListeners();
  }

  clearAllDecks(): void {
    this.deck.mainDeck.length = 0;
    this.deck.extraDeck.length = 0;
    this.deck.sideDeck.length = 0;
    this.notifyListeners();
  }

  public getGenesysPoints(): number {
    return this.calculateGenesysPoints();
  }

  private calculateGenesysPoints(): number {
    let totalPoints = 0;

    const allDecks = [
      ...this.deck.mainDeck,
      ...this.deck.extraDeck,
      ...this.deck.sideDeck
    ];

    allDecks.forEach((deckCard) => {
      const cardPoints = GenesysService.getCardPoints(deckCard.card.name);
      totalPoints += cardPoints * deckCard.quantity;
    });

    return totalPoints;
  }

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
      totalCards:
        this.getTotalCardsInDeck(DeckType.MAIN) +
        this.getTotalCardsInDeck(DeckType.EXTRA) +
        this.getTotalCardsInDeck(DeckType.SIDE),
      genesysPoints: this.calculateGenesysPoints()
    };
  }

  setDeckName(name: string): void {
    this.deck.name = name;
    this.notifyListeners();
  }

  loadDeck(deckState: DeckState): void {
    this.deck = { ...deckState };
    this.notifyListeners();
  }

  exportDeck(): string {
    return JSON.stringify(this.deck, null, 2);
  }

  importDeck(jsonString: string): boolean {
    try {
      const deckState = JSON.parse(jsonString) as DeckState;

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
