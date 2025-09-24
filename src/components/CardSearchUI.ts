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
        this.handleSearch();
      }
    });

    this.searchInput.addEventListener('input', () => {
      // Clear results if search is empty
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
      this.showError('Error al buscar cartas. Por favor, inténtalo de nuevo.');
    }
  }

  private showLoading(): void {
    this.resultsContainer.innerHTML = `
      <div class="loading">
        <p>Buscando cartas...</p>
      </div>
    `;
  }

  private showError(message: string): void {
    this.resultsContainer.innerHTML = `
      <div class="error">
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
        <div class="no-results">
          <p>No se encontraron cartas.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = cards.map(card => this.createCardElement(card)).join('');
    this.resultsContainer.innerHTML = `
      <div class="results-header">
        <h4>Resultados (${cards.length} cartas encontradas)</h4>
      </div>
      <div class="cards-grid">
        ${cardsHtml}
      </div>
    `;
  }

  private createCardElement(card: Card): string {
    // const imageUrl = card.card_images?.[0]?.url_small || '';
    const imageUrl = 'https://tse4.mm.bing.net/th/id/OIP._QPFrccrbRCBl9eIlJvE0QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3';
    const atkDef = (card.atk !== undefined && card.def !== undefined) 
      ? `${card.atk}/${card.def}` 
      : '';
    const level = card.level ? `★${card.level}` : '';
    const attribute = card.attribute ? card.attribute.substring(0, 3) : '';
    
    // Get Genesys points for the card
    const points = GenesysService.getCardPoints(card.name);
    let genesysPointsHtml = '';
    if (points > 0) {
      genesysPointsHtml = `<span class="card-genesys-points" data-points="${points}">${points}pts</span>`;
    }

    return `
      <div class="card-item-compact" data-card-id="${card.id}" title="${card.name}">
        <div class="card-image-compact">
          <img src="${imageUrl}" alt="${card.name}" loading="lazy">
          ${level ? `<span class="card-level-badge">${level}</span>` : ''}
          ${attribute ? `<span class="card-attribute-badge">${attribute}</span>` : ''}
          ${genesysPointsHtml}
        </div>
        <div class="card-info-compact">
          <h6 class="card-name-compact">${card.name}</h6>
          <p class="card-type-compact">${card.race}</p>
          ${atkDef ? `<p class="card-stats-compact">${atkDef}</p>` : ''}
        </div>
        <button class="add-card-btn-compact" data-card-id="${card.id}" title="Agregar ${card.name} al deck">
          +
        </button>
      </div>
    `;
  }



  public initializeCardActions(): void {
    this.resultsContainer.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('add-card-btn-compact') || target.classList.contains('add-card-btn')) {
        const cardId = parseInt(target.getAttribute('data-card-id') || '0');
        
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
      this.showError('Error al cargar cartas aleatorias.');
    }
  }
}