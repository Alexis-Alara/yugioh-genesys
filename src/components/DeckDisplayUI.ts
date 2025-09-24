import type { DeckState, DeckCard, DeckTypeValue } from '../types/Card';
import { DeckType } from '../types/Card';
import { GenesysService } from '../services/GenesysService';

//const AVATAR_PLACEHOLDER = 'https://www.google.com/url?sa=i&url=https%3A%2F%2Faminoapps.com%2Fc%2Fyugioh-espanol%2Fpage%2Fblog%2Fcartas-caracteristicas-de-yu-gi-oh%2F1YvK_oxh6u0ozo6nndaV2aMdbQ8eBzkG5V&psig=AOvVaw0JSkRLYInOdvYtnc1Id34T&ust=1758764242524000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCNjou8Oh8I8DFQAAAAAdAAAAABAE';

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
    [this.mainDeckContainer, this.extraDeckContainer, this.sideDeckContainer].forEach((container) => {
      container.addEventListener('click', (event) => {
        const button = (event.target as HTMLElement).closest('.deck-avatar-action') as HTMLElement | null;

        if (!button) {
          return;
        }

        const cardId = parseInt(button.getAttribute('data-card-id') || '0', 10);
        const deckType = button.getAttribute('data-deck-type') as DeckTypeValue;
        const action = button.getAttribute('data-action');

        if (!cardId || !deckType || !action) {
          return;
        }

        if (action === 'add') {
          this.onAddCard(cardId, deckType);
        } else if (action === 'remove') {
          this.onRemoveCard(cardId, deckType, false);
        } else if (action === 'delete') {
          this.onRemoveCard(cardId, deckType, true);
        }
      });
    });
  }

  public updateDeckDisplay(deckState: DeckState): void {
    this.displayDeckCards(this.mainDeckContainer, deckState.mainDeck, DeckType.MAIN);
    this.displayDeckCards(this.extraDeckContainer, deckState.extraDeck, DeckType.EXTRA);
    this.displayDeckCards(this.sideDeckContainer, deckState.sideDeck, DeckType.SIDE);

    this.updateDeckCounts(deckState);
    this.updateDeckInsights(deckState);
    this.updateDeckTotal(deckState);
  }

  private displayDeckCards(container: HTMLElement, deckCards: DeckCard[], deckType: DeckTypeValue): void {
    if (deckCards.length === 0) {
      container.innerHTML = `
        <div class="deck-lane-empty">
          <p>No cards in this section</p>
        </div>
      `;
      return;
    }

    const cardsHtml = deckCards
      .map((deckCard) => this.createDeckAvatar(deckCard, deckType))
      .join('');

    container.innerHTML = `
      <div class="deck-avatar-list">
        ${cardsHtml}
      </div>
    `;
  }

  private createDeckAvatar(deckCard: DeckCard, deckType: DeckTypeValue): string {
    const card = deckCard.card;
    const fullImageUrl = card.card_images?.[0]?.id || 0;
    const quantity = deckCard.quantity;
    const basePoints = GenesysService.getCardPoints(card.name) || 0;
    const totalPoints = basePoints * quantity;
    const formattedPoints = totalPoints.toLocaleString('es-MX');
   
    const pointsLabel = totalPoints === 1 ? 'PT' : 'PTS';
    const scoreClass = basePoints > 0 ? '' : ' deck-avatar-score--zero';
    const previewData = this.buildPreviewDataset(card, fullImageUrl);

    return `
     <div
  class="deck-avatar card-hover-target"
  style="--bg-image: url('https://yugiohgenesys.com.mx/api/cards/${fullImageUrl}')"
  data-card-id="${card.id}"
  data-deck-type="${deckType}"
  title="${this.escapeAttribute(card.name)}"
  ${previewData}
>
  <img
    class="deck-avatar-image"
    src="https://yugiohgenesys.com.mx/api/cards/${fullImageUrl}"
    alt="${this.escapeAttribute(card.name)}"
    loading="lazy"
  />

  <div class="deck-avatar-overlay">
    <div class="deck-avatar-qty" aria-label="Cantidad de copias">
      <span>${quantity}</span>
    </div>

    <div class="deck-avatar-actions" role="group" aria-label="Acciones de carta">
      <button class="deck-avatar-action" type="button" data-action="add" data-card-id="${card.id}" data-deck-type="${deckType}" title="Agregar una copia">
        <span class="material-symbols-outlined">add</span>
      </button>
      <button class="deck-avatar-action" type="button" data-action="remove" data-card-id="${card.id}" data-deck-type="${deckType}" title="Quitar una copia">
        <span class="material-symbols-outlined">remove</span>
      </button>
      <button class="deck-avatar-action" type="button" data-action="delete" data-card-id="${card.id}" data-deck-type="${deckType}" title="Eliminar todas las copias">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>

    <div class="deck-avatar-score${scoreClass}" aria-label="Puntos Genesys">
      <span class="deck-avatar-score-number">${formattedPoints}</span>
      <span class="deck-avatar-score-label">${pointsLabel}</span>
    </div>
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

    this.updateCountState(this.mainCountElement, mainCount, 60);
    this.updateCountState(this.extraCountElement, extraCount, 15);
    this.updateCountState(this.sideCountElement, sideCount, 15);
  }

  private updateDeckInsights(deckState: DeckState): void {
    const stats = { monster: 0, spell: 0, trap: 0 };

    deckState.mainDeck.forEach((deckCard) => {
      const type = deckCard.card.type;
      const qty = deckCard.quantity;

      if (type.includes('Spell')) {
        stats.spell += qty;
      } else if (type.includes('Trap')) {
        stats.trap += qty;
      } else {
        stats.monster += qty;
      }
    });

    const monsterElement = document.getElementById('stat-monster');
    const spellElement = document.getElementById('stat-spell');
    const trapElement = document.getElementById('stat-trap');

    if (monsterElement) {
      monsterElement.textContent = stats.monster.toString();
    }
    if (spellElement) {
      spellElement.textContent = stats.spell.toString();
    }
    if (trapElement) {
      trapElement.textContent = stats.trap.toString();
    }
  }

  private updateDeckTotal(deckState: DeckState): void {
    const total =
      this.getTotalCardsCount(deckState.mainDeck) +
      this.getTotalCardsCount(deckState.extraDeck) +
      this.getTotalCardsCount(deckState.sideDeck);

    const deckTotalElement = document.getElementById('deck-total');
    if (deckTotalElement) {
      deckTotalElement.textContent = this.formatCardTotal(total);
    }
  }

  private formatCardTotal(total: number): string {
    return `${total} ${total === 1 ? 'card' : 'cards'}`;
  }

  private updateCountState(element: HTMLElement, count: number, limit: number): void {
    element.classList.remove('count-warning', 'count-full', 'count-normal');

    if (count === limit) {
      element.classList.add('count-full');
    } else if (count >= limit * 0.8) {
      element.classList.add('count-warning');
    } else {
      element.classList.add('count-normal');
    }
  }

  private getTotalCardsCount(deckCards: DeckCard[]): number {
    return deckCards.reduce((total, deckCard) => total + deckCard.quantity, 0);
  }

  public updateGenesysPointsDisplay(deckManager: any): void {
    const genesysPointsElement = document.getElementById('genesys-points');
    if (genesysPointsElement) {
      const totalPoints = deckManager.calculateGenesysPoints();
      genesysPointsElement.textContent = totalPoints.toLocaleString('en-US');
    }
  }

  private buildPreviewDataset(card: DeckCard['card'], imageUrl: number): string {
    const sanitizedDesc = this.escapeAttribute(this.normalizeWhitespace(card.desc));
    const attrs = [
      `data-card-name="${this.escapeAttribute(card.name)}"`,
      `data-card-type="${this.escapeAttribute(card.type)}"`,
      `data-card-race="${this.escapeAttribute(card.race)}"`,
      `data-card-attribute="${this.escapeAttribute(card.attribute || '')}"`,
      `data-card-level="${card.level ?? ''}"`,
      `data-card-link="${card.linkval ?? ''}"`,
      `data-card-scale="${card.scale ?? ''}"`,
      `data-card-atk="${card.atk ?? ''}"`,
      `data-card-def="${card.def ?? ''}"`,
      `data-card-desc="${sanitizedDesc}"`,
      `data-card-image="https://yugiohgenesys.com.mx/api/cards/${imageUrl}"`
    ];

    return attrs.join(' ');
  }

  private normalizeWhitespace(value: string): string {
    return value ? value.replace(/\s+/g, ' ').trim() : '';
  }

  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;');
  }
}
