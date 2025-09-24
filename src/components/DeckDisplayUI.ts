import type { DeckState, DeckCard, DeckTypeValue } from '../types/Card';
import { DeckType } from '../types/Card';
import { GenesysService } from '../services/GenesysService';

export class DeckDisplayUI {
  private mainDeckContainer: HTMLElement;
  private extraDeckContainer: HTMLElement;
  private sideDeckContainer: HTMLElement;
  private mainCountElement: HTMLElement;
  private extraCountElement: HTMLElement;
  private sideCountElement: HTMLElement;
  private onRemoveCard: (cardId: number, deckType: DeckTypeValue, removeAll: boolean) => void;
  private onAddCard: (cardId: number, deckType: DeckTypeValue) => void;

  constructor(
    mainDeckId: string,
    extraDeckId: string,
    sideDeckId: string,
    mainCountId: string,
    extraCountId: string,
    sideCountId: string,
    onRemoveCard: (cardId: number, deckType: DeckTypeValue, removeAll: boolean) => void,
    onAddCard: (cardId: number, deckType: DeckTypeValue) => void
  ) {
    this.mainDeckContainer = document.getElementById(mainDeckId) as HTMLElement;
    this.extraDeckContainer = document.getElementById(extraDeckId) as HTMLElement;
    this.sideDeckContainer = document.getElementById(sideDeckId) as HTMLElement;
    this.mainCountElement = document.getElementById(mainCountId) as HTMLElement;
    this.extraCountElement = document.getElementById(extraCountId) as HTMLElement;
    this.sideCountElement = document.getElementById(sideCountId) as HTMLElement;
    this.onRemoveCard = onRemoveCard;
    this.onAddCard = onAddCard;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Add event listeners for remove card actions
    [this.mainDeckContainer, this.extraDeckContainer, this.sideDeckContainer].forEach(container => {
      container.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        if (target.classList.contains('add-one-btn')) {
          const cardId = parseInt(target.getAttribute('data-card-id') || '0');
          const deckType = target.getAttribute('data-deck-type') as DeckTypeValue;
          
          if (cardId && deckType) {
            this.onAddCard(cardId, deckType);
          }
        } else if (target.classList.contains('remove-one-btn')) {
          const cardId = parseInt(target.getAttribute('data-card-id') || '0');
          const deckType = target.getAttribute('data-deck-type') as DeckTypeValue;
          
          if (cardId && deckType) {
            this.onRemoveCard(cardId, deckType, false);
          }
        } else if (target.classList.contains('remove-all-btn')) {
          const cardId = parseInt(target.getAttribute('data-card-id') || '0');
          const deckType = target.getAttribute('data-deck-type') as DeckTypeValue;
          
          if (cardId && deckType) {
            this.onRemoveCard(cardId, deckType, true);
          }
        }
      });
    });
  }

  public updateDeckDisplay(deckState: DeckState): void {
    this.displayDeckCards(this.mainDeckContainer, deckState.mainDeck, DeckType.MAIN);
    this.displayDeckCards(this.extraDeckContainer, deckState.extraDeck, DeckType.EXTRA);
    this.displayDeckCards(this.sideDeckContainer, deckState.sideDeck, DeckType.SIDE);
    
    this.updateDeckCounts(deckState);
  }

  private displayDeckCards(container: HTMLElement, deckCards: DeckCard[], deckType: DeckTypeValue): void {
    if (deckCards.length === 0) {
      container.innerHTML = `
        <div class="empty-deck">
          <p>No hay cartas en este deck</p>
        </div>
      `;
      return;
    }

    const cardsHtml = deckCards.map(deckCard => 
      this.createDeckCardElement(deckCard, deckType)
    ).join('');
    
    container.innerHTML = `
      <div class="deck-cards">
        ${cardsHtml}
      </div>
    `;
  }

  private createDeckCardElement(deckCard: DeckCard, deckType: DeckTypeValue): string {
    const card = deckCard.card;
    const imageUrl = card.card_images?.[0]?.url_small || '';
    const quantity = deckCard.quantity;
    
    // Get Genesys points
    const points = GenesysService.getCardPoints(card.name);
    const totalPoints = points * quantity;
    let genesysPointsHtml = '';
    if (points > 0) {
      const color = GenesysService.getPointsColor(points);
      genesysPointsHtml = `<span class="deck-card-points" style="color: ${color}" title="Genesys: ${points} x ${quantity} = ${totalPoints} puntos">${totalPoints}pts</span>`;
    }

    return `
      <div class="deck-card-item" data-card-id="${card.id}">
        <div class="deck-card-image">
          <img src="${imageUrl}" alt="${card.name}" loading="lazy">
          <div class="card-quantity">${quantity}</div>
        </div>
        <div class="deck-card-info">
          <h6 class="deck-card-name">${card.name}</h6>
          <p class="deck-card-type">${card.type}</p>
          ${genesysPointsHtml}
        </div>
        <div class="deck-card-actions">
          <button class="add-one-btn" 
                  data-card-id="${card.id}" 
                  data-deck-type="${deckType}"
                  title="Agregar una carta">
            +1
          </button>
          <button class="remove-one-btn" 
                  data-card-id="${card.id}" 
                  data-deck-type="${deckType}"
                  title="Remover una carta">
            -1
          </button>
          <button class="remove-all-btn" 
                  data-card-id="${card.id}" 
                  data-deck-type="${deckType}"
                  title="Remover todas las cartas">
            ×
          </button>
        </div>
      </div>
    `;
  }

  private updateDeckCounts(deckState: DeckState): void {
    const mainCount = this.getTotalCardsCount(deckState.mainDeck);
    const extraCount = this.getTotalCardsCount(deckState.extraDeck);
    const sideCount = this.getTotalCardsCount(deckState.sideDeck);

    this.mainCountElement.textContent = `(${mainCount}/60)`;
    this.extraCountElement.textContent = `(${extraCount}/15)`;
    this.sideCountElement.textContent = `(${sideCount}/15)`;

    // Update count colors based on limits
    this.updateCountColor(this.mainCountElement, mainCount, 60);
    this.updateCountColor(this.extraCountElement, extraCount, 15);
    this.updateCountColor(this.sideCountElement, sideCount, 15);
  }

  private updateCountColor(element: HTMLElement, count: number, limit: number): void {
    element.classList.remove('count-warning', 'count-full', 'count-normal');
    
    if (count === limit) {
      element.classList.add('count-full');
    } else if (count > limit * 0.8) {
      element.classList.add('count-warning');
    } else {
      element.classList.add('count-normal');
    }
  }

  private getTotalCardsCount(deckCards: DeckCard[]): number {
    return deckCards.reduce((total, deckCard) => total + deckCard.quantity, 0);
  }

  public showDeckStats(deckState: DeckState): void {
    const stats = {
      main: this.getTotalCardsCount(deckState.mainDeck),
      extra: this.getTotalCardsCount(deckState.extraDeck),
      side: this.getTotalCardsCount(deckState.sideDeck)
    };

    const totalCards = stats.main + stats.extra + stats.side;
    const uniqueCards = deckState.mainDeck.length + deckState.extraDeck.length + deckState.sideDeck.length;

    console.log('Deck Stats:', {
      'Total Cards': totalCards,
      'Unique Cards': uniqueCards,
      'Main Deck': `${stats.main}/60`,
      'Extra Deck': `${stats.extra}/15`,
      'Side Deck': `${stats.side}/15`
    });
  }

  updateGenesysPointsDisplay(deckManager: any): void {
    const genesysPointsElement = document.getElementById('genesys-points');
    if (genesysPointsElement) {
      const totalPoints = deckManager.calculateGenesysPoints();
      genesysPointsElement.textContent = totalPoints.toString();
    }
  }
}