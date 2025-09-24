import type { Card } from '../types/Card';
import { GenesysService } from '../services/GenesysService';

export class CardSearchUI {
  private searchInput: HTMLInputElement;
  private searchButton: HTMLButtonElement;
  private resultsContainer: HTMLElement;
  private onCardSelect: (card: Card) => void;

  constructor(
    searchInputId: string,
    searchButtonId: string,
    resultsContainerId: string,
    onCardSelect: (card: Card) => void
  ) {
    this.searchInput = document.getElementById(searchInputId) as HTMLInputElement;
    this.searchButton = document.getElementById(searchButtonId) as HTMLButtonElement;
    this.resultsContainer = document.getElementById(resultsContainerId) as HTMLElement;
    this.onCardSelect = onCardSelect;

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.searchButton.addEventListener('click', () => this.handleSearch());

    this.searchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleSearch();
      }
    });

    this.searchInput.addEventListener('input', () => {
      if (!this.searchInput.value.trim()) {
        this.clearResults();
      }
    });
  }

  private async handleSearch(): Promise<void> {
    const searchTerm = this.searchInput.value.trim();

    if (!searchTerm) {
      this.clearResults();
      return;
    }

    this.showLoading();

    try {
      const { YugiohApiService } = await import('../services/YugiohApiService');
      const cards = await YugiohApiService.searchCardsByName(searchTerm);
      this.displayResults(cards);
    } catch (error) {
      console.error('Error searching cards:', error);
      this.showError('We could not find cards right now. Please try again.');
    }
  }

  private showLoading(): void {
    this.resultsContainer.innerHTML = `
      <div class="search-feedback loading">
        <span class="pulse"></span>
        <p>Searching cards...</p>
      </div>
    `;
  }

  private showError(message: string): void {
    this.resultsContainer.innerHTML = `
      <div class="search-feedback error">
        <p>${message}</p>
      </div>
    `;
  }

  private clearResults(): void {
    this.resultsContainer.innerHTML = '';
  }

  private displayResults(cards: Card[]): void {
    if (cards.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="search-feedback empty">
          <p>No cards were found.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = cards.map((card) => this.createCardElement(card)).join('');

    this.resultsContainer.innerHTML = `
      <div class="results-meta">
        <span class="results-count">${cards.length} cards found</span>
      </div>
      <div class="cards-grid">
        ${cardsHtml}
      </div>
    `;
  }

  private createCardElement(card: Card): string {
    //const thumbUrl = card.card_images?.[0]?.url_small || '';
    const fullImageUrl = card.card_images?.[0]?.id || 0;
    const atk = card.atk != null ? card.atk.toString() : '';
    const def = card.def != null ? card.def.toString() : '';
    const stats = atk && def ? `${atk}/${def}` : atk ? `${atk}/?` : def ? `?/${def}` : '';
    const level = card.level ? `LV.${card.level}` : card.linkval ? `LINK-${card.linkval}` : '';
    const attribute = card.attribute ? card.attribute : '';

    const points = GenesysService.getCardPoints(card.name);
    const genesysBadge = points > 0
      ? `<span class="search-card-points" title="Genesys score">${points} pts</span>`
      : '';

    const previewAttrs = this.buildPreviewDataset(card, fullImageUrl);

    return `
      <div class="search-card card-hover-target" data-card-id="${card.id}" ${previewAttrs}>
        <div class="search-card-thumb">
          <img src="http://207.244.226.105:8000/cards/${fullImageUrl}" alt="${this.escapeAttribute(card.name)}" loading="lazy" />
          ${level ? `<span class="search-card-level">${this.escapeText(level)}</span>` : ''}
          ${attribute ? `<span class="search-card-attribute">${this.escapeText(attribute)}</span>` : ''}
        </div>
        <div class="search-card-body">
          <div class="search-card-title">
            <h5>${this.escapeText(card.name)}</h5>
            ${genesysBadge}
          </div>
          <span class="search-card-type">${this.escapeText(card.type)}</span>
          <span class="search-card-race">${this.escapeText(card.race)}</span>
          ${stats ? `<span class="search-card-stats">${this.escapeText(stats)}</span>` : ''}
        </div>
        <button
          class="search-card-add add-card-btn-compact"
          data-card-id="${card.id}"
          title="Add ${this.escapeAttribute(card.name)}"
        >
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    `;
  }

  public initializeCardActions(): void {
    this.resultsContainer.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;

      const button = target.closest('.add-card-btn-compact') as HTMLElement | null;
      if (!button) {
        return;
      }

      const cardId = parseInt(button.getAttribute('data-card-id') || '0', 10);

      if (cardId) {
        try {
          const { YugiohApiService } = await import('../services/YugiohApiService');
          const card = await YugiohApiService.getCardById(cardId);

          if (card) {
            this.onCardSelect(card);
          }
        } catch (error) {
          console.error('Error adding card to deck:', error);
        }
      }
    });
  }

  public async loadRandomCards(): Promise<void> {
    this.showLoading();

    try {
      const { YugiohApiService } = await import('../services/YugiohApiService');
      const cards = await YugiohApiService.getRandomCards(40);
      this.displayResults(cards);
    } catch (error) {
      console.error('Error loading random cards:', error);
      this.showError('Unable to load random cards right now.');
    }
  }

  private buildPreviewDataset(card: Card, imageUrl: number): string {
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
      `data-card-image="http://207.244.226.105:8000/cards/${imageUrl}"`,
    ];
    console.log('Preview attributes:', imageUrl);
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

  private escapeText(value: string): string {
    return this.escapeAttribute(value);
  }
}
