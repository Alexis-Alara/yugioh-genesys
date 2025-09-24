import type { Card, SearchFilters as ApiSearchFilters } from '../types/Card';
import { GenesysService } from '../services/GenesysService';

export class CardSearchUI {
  private searchInput: HTMLInputElement;
  private typeSelect: HTMLSelectElement;
  private attributeSelect: HTMLSelectElement;
  private levelSelect: HTMLSelectElement;
  private raceSelect: HTMLSelectElement | null = null;
  private resultsContainer: HTMLElement;
  private onCardSelect: (card: Card) => void;
  private debouncedSearch: () => void;
  private filtersToggleBtn: HTMLButtonElement | null = null;
  private filtersContainer: HTMLElement | null = null;
  private clearFiltersBtn: HTMLButtonElement | null = null;
  private readonly handleToggleFiltersClick = () => this.toggleFilters();
  private readonly handleClearFiltersClick = () => this.clearAllFilters();

  constructor(
    searchInputId: string,
    typeSelectId: string,
    attributeSelectId: string,
    levelSelectId: string,
    resultsContainerId: string,
    onCardSelect: (card: Card) => void,
    filtersToggleBtnId?: string,
    filtersContainerId?: string,
    clearFiltersBtnId?: string,
    raceSelectId?: string
  ) {
    this.searchInput = document.getElementById(searchInputId) as HTMLInputElement;
    this.typeSelect = document.getElementById(typeSelectId) as HTMLSelectElement;
    this.attributeSelect = document.getElementById(attributeSelectId) as HTMLSelectElement;
    this.levelSelect = document.getElementById(levelSelectId) as HTMLSelectElement;
    this.resultsContainer = document.getElementById(resultsContainerId) as HTMLElement;
    this.onCardSelect = onCardSelect;

    // Initialize race filter (optional)
    if (raceSelectId) {
      this.raceSelect = document.getElementById(raceSelectId) as HTMLSelectElement;
    }

    // Initialize filter elements (optional)
    if (filtersToggleBtnId) {
      this.filtersToggleBtn = document.getElementById(filtersToggleBtnId) as HTMLButtonElement;
    }
    if (filtersContainerId) {
      this.filtersContainer = document.getElementById(filtersContainerId) as HTMLElement;
    }
    if (clearFiltersBtnId) {
      this.clearFiltersBtn = document.getElementById(clearFiltersBtnId) as HTMLButtonElement;
    }

    this.initializeFiltersUI();

    this.debouncedSearch = this.createDebounce(() => this.handleSearch(), 300);

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.searchInput.addEventListener('input', this.debouncedSearch);
    this.typeSelect.addEventListener('change', this.debouncedSearch);
    this.attributeSelect.addEventListener('change', this.debouncedSearch);
    this.levelSelect.addEventListener('change', this.debouncedSearch);

    // Add race filter event listener if available
    if (this.raceSelect) {
      this.raceSelect.addEventListener('change', this.debouncedSearch);
    }

    // Event listeners for filters
    if (this.filtersToggleBtn) {
      this.filtersToggleBtn.addEventListener('click', this.handleToggleFiltersClick);
    }
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', this.handleClearFiltersClick);
    }
  }

  private initializeFiltersUI(): void {
    if (this.filtersContainer) {
      this.filtersContainer.classList.remove('is-visible');
      this.filtersContainer.setAttribute('hidden', '');
    }

    if (this.filtersToggleBtn) {
      this.updateFiltersToggleAppearance(false);
      this.filtersToggleBtn.setAttribute('data-has-filters', 'false');
    }
  }

  private updateFiltersToggleAppearance(isVisible: boolean): void {
    if (!this.filtersToggleBtn) {
      return;
    }

    const icon = isVisible ? 'close' : 'tune';
    const label = isVisible ? 'Hide filters' : 'Show filters';

    this.filtersToggleBtn.innerHTML = `
      <span class="material-symbols-outlined" aria-hidden="true">${icon}</span>
      <span class="sr-only">${label}</span>
    `;
    this.filtersToggleBtn.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
  }

  private createDebounce(callback: () => void, delay: number): () => void {
    let timeoutId: number | undefined;
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        callback();
      }, delay);
    };
  }

  private buildFilters(): ApiSearchFilters {
    const filters: ApiSearchFilters = {};
    const name = this.searchInput.value.trim();
    const type = this.typeSelect.value.trim();
    const attribute = this.attributeSelect.value.trim();
    const levelValue = this.levelSelect.value.trim();
    const race = this.raceSelect?.value.trim();

    if (name) {
      filters.name = name;
    }
    if (type) {
      filters.type = type;
    }
    if (attribute) {
      filters.attribute = attribute;
    }
    if (levelValue) {
      const levelNumber = Number(levelValue);
      if (!Number.isNaN(levelNumber)) {
        filters.level = levelNumber;
      }
    }
    if (race) {
      filters.race = race;
    }

    return filters;
  }

  private async handleSearch(): Promise<void> {
    const filters = this.buildFilters();
    const hasFilters = Boolean(filters.name || filters.type || filters.attribute || filters.level || filters.race);

    this.updateFiltersIndicator(hasFilters);

    if (!hasFilters) {
      this.clearResults();
      return;
    }

    this.showLoading();

    try {
      const { YugiohApiService } = await import('../services/YugiohApiService');
      const cards = await YugiohApiService.searchCardsWithFilters(filters);
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
          <img src="https://yugiohgenesys.com.mx/api/cards/${fullImageUrl}" alt="${this.escapeAttribute(card.name)}" loading="lazy" />
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
        <button class="card-preview-trigger search-card-detail" type="button">View details</button>
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

  private toggleFilters(): void {
    if (!this.filtersContainer) {
      return;
    }

    const isVisible = this.filtersContainer.classList.toggle('is-visible');
    this.filtersContainer.toggleAttribute('hidden', !isVisible);

    this.updateFiltersToggleAppearance(isVisible);
  }

  private updateFiltersIndicator(hasFilters: boolean): void {
    if (!this.filtersToggleBtn) {
      return;
    }

    this.filtersToggleBtn.setAttribute('data-has-filters', hasFilters ? 'true' : 'false');
  }

  private clearAllFilters(): void {
    // Clear all filter fields
    this.searchInput.value = '';
    this.typeSelect.value = '';
    this.attributeSelect.value = '';
    this.levelSelect.value = '';
    if (this.raceSelect) {
      this.raceSelect.value = '';
    }

    this.searchInput.focus();

    // Trigger search to show all results
    this.handleSearch();
  }

  // Método público para inicializar filtros (opcional)
  public initializeFilters(
    filtersToggleBtnId: string,
    filtersContainerId: string,
    clearFiltersBtnId: string,
    raceSelectId?: string
  ): void {
    if (this.filtersToggleBtn) {
      this.filtersToggleBtn.removeEventListener('click', this.handleToggleFiltersClick);
    }
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.removeEventListener('click', this.handleClearFiltersClick);
    }
    if (this.raceSelect) {
      this.raceSelect.removeEventListener('change', this.debouncedSearch);
    }

    this.filtersToggleBtn = document.getElementById(filtersToggleBtnId) as HTMLButtonElement;
    this.filtersContainer = document.getElementById(filtersContainerId) as HTMLElement;
    this.clearFiltersBtn = document.getElementById(clearFiltersBtnId) as HTMLButtonElement;

    this.initializeFiltersUI();

    if (raceSelectId) {
      this.raceSelect = document.getElementById(raceSelectId) as HTMLSelectElement;
      if (this.raceSelect) {
        this.raceSelect.addEventListener('change', this.debouncedSearch);
      }
    } else {
      this.raceSelect = null;
    }

    if (this.filtersToggleBtn) {
      this.filtersToggleBtn.addEventListener('click', this.handleToggleFiltersClick);
    }
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener('click', this.handleClearFiltersClick);
    }
  }

  private buildPreviewDataset(card: Card, imageUrl: number): string {
    const sanitizedDesc = this.escapeAttribute(this.normalizeWhitespace(card.desc));
    const attrs = [
      `data-card-name="${this.escapeAttribute(card.name)}"`,
      `data-card-type="${this.escapeAttribute(card.type)}"`,
      `data-card-race="${this.escapeAttribute(card.race)}"`,
      `data-card-attribute="${this.escapeAttribute(card.attribute || '')}"`,
      `data-card-level="${card.level !== undefined ? card.level.toString() : ''}"`,
      `data-card-link="${card.linkval !== undefined ? card.linkval.toString() : ''}"`,
      `data-card-scale="${card.scale !== undefined ? card.scale.toString() : ''}"`,
      `data-card-atk="${card.atk !== undefined ? card.atk.toString() : ''}"`,
      `data-card-def="${card.def !== undefined ? card.def.toString() : ''}"`,
      `data-card-desc="${sanitizedDesc}"`,
      `data-card-image="https://yugiohgenesys.com.mx/api/cards/${imageUrl}"`,
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

  private escapeText(value: string): string {
    return this.escapeAttribute(value);
  }
}
