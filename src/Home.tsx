import React, { useEffect, useRef } from 'react';
import './style.css';
import { DeckManager } from './services/DeckManager';
import { DeckStorageService } from './services/DeckStorageService';
import { CardSearchUI } from './components/CardSearchUI';
import { DeckDisplayUI } from './components/DeckDisplayUI';
import { CardHoverPreview } from './components/CardPreviewOverlay';
import type { Card, DeckState, DeckTypeValue } from './types/Card';

const Home: React.FC = () => {
  const deckManagerRef = useRef<DeckManager>(DeckManager.getInstance());
  const cardSearchUIRef = useRef<CardSearchUI | null>(null);
  const deckDisplayUIRef = useRef<DeckDisplayUI | null>(null);
  const deckNameInputRef = useRef<HTMLInputElement | null>(null);

  const showMessage = (message: string, type: 'success' | 'error' | 'info') => {
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
  };

  const handleCardSelect = (card: Card) => {
    const deckManager = deckManagerRef.current;
    const canAdd = deckManager.canAddCard(card);

    if (canAdd.canAdd) {
      const success = deckManager.addCard(card);
      if (success) {
        showMessage(`Added "${card.name}" to the deck.`, 'success');
      }
      return;
    }

    if (canAdd.suggestedDeckType) {
      const canAddToSuggested = deckManager.canAddCard(card, canAdd.suggestedDeckType);
      if (canAddToSuggested.canAdd) {
        const success = deckManager.addCard(card, canAdd.suggestedDeckType);
        if (success) {
          showMessage(
            `Added "${card.name}" to the ${canAdd.suggestedDeckType} deck.`,
            'success'
          );
          return;
        }
      }
    }

    showMessage(canAdd.reason || 'Card could not be added.', 'error');
  };

  const handleAddCard = (cardId: number, deckType: DeckTypeValue) => {
    const success = deckManagerRef.current.addCardById(cardId, deckType);
    if (success) {
      showMessage('Card added to the deck.', 'success');
    }
  };

  const handleRemoveCard = (cardId: number, deckType: DeckTypeValue, removeAll: boolean) => {
    const success = deckManagerRef.current.removeCard(cardId, deckType, removeAll);
    if (success) {
      const removedLabel = removeAll ? 'Cards removed from the deck.' : 'Card removed from the deck.';
      showMessage(removedLabel, 'info');
    }
  };

  const handleNewDeck = () => {
    const confirmation = confirm(
      'Reset the entire deck? This action cannot be undone.'
    );

    if (confirmation) {
      deckManagerRef.current.clearAllDecks();
      deckManagerRef.current.setDeckName('My Deck');
      showMessage('Deck reset completed.', 'info');
    }
  };

  const handleImportDeck = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ydk';

    input.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        try {
          const deckState = await DeckStorageService.importDeckFromFile(file);
          deckManagerRef.current.loadDeck(deckState);
          showMessage(
            `Deck "${deckState.name || 'Imported'}" loaded from YDK file successfully.`,
            'success'
          );
        } catch (error) {
          console.error('Error loading deck:', error);
          showMessage('Deck import failed. Check the selected file.', 'error');
        }
      }
    });

    input.click();
  };

  const handleExportDeck = () => {
    const deckState = deckManagerRef.current.getDeckState();
    const deckName = deckState.name && deckState.name.trim() ? deckState.name.trim() : 'My Deck';

    DeckStorageService.exportDeckToFile(deckState, deckName);
    showMessage(`Deck "${deckName}" exported as .ydk file.`, 'success');
  };

  const syncDeckName = (deckState: DeckState) => {
    const input = deckNameInputRef.current;
    if (!input) return;

    const deckName = deckState.name && deckState.name.trim() ? deckState.name : 'My Deck';
    if (document.activeElement !== input) {
      input.value = deckName;
    }
  };

  useEffect(() => {
    // Initialize CardHoverPreview
    new CardHoverPreview();

    // Initialize CardSearchUI
    cardSearchUIRef.current = new CardSearchUI(
      'card-search',
      'filter-type',
      'filter-attribute',
      'filter-level',
      'search-results',
      handleCardSelect,
      'filters-toggle-btn',
      'search-filters',
      'filters-clear-btn'
    );

    // Initialize DeckDisplayUI
    deckDisplayUIRef.current = new DeckDisplayUI(
      'main-deck',
      'extra-deck',
      'side-deck',
      'main-count',
      'extra-count',
      'side-count',
      handleRemoveCard,
      handleAddCard
    );

    // Store deck name input reference
    deckNameInputRef.current = document.getElementById('deck-name-input') as HTMLInputElement;

    // Load saved deck
    const savedDeck = DeckStorageService.loadDeck();
    if (savedDeck) {
      deckManagerRef.current.loadDeck(savedDeck);
    }

    // Set up deck manager listener
    deckManagerRef.current.addListener((deckState) => {
      deckDisplayUIRef.current?.updateDeckDisplay(deckState);
      deckDisplayUIRef.current?.updateGenesysPointsDisplay(deckManagerRef.current);
      syncDeckName(deckState);
      DeckStorageService.saveDeck(deckState);
    });

    // Initialize card search and load initial cards
    cardSearchUIRef.current.initializeCardActions();
    cardSearchUIRef.current.loadRandomCards();

    // Update initial display
    const deckState = deckManagerRef.current.getDeckState();
    deckDisplayUIRef.current?.updateDeckDisplay(deckState);
    deckDisplayUIRef.current?.updateGenesysPointsDisplay(deckManagerRef.current);
    syncDeckName(deckState);

    // Set up deck name input listeners
    const input = deckNameInputRef.current;
    if (input) {
      const commitDeckName = () => {
        const value = input.value.trim();
        const normalizedName = value || 'My Deck';
        deckManagerRef.current.setDeckName(normalizedName);
      };

      input.addEventListener('blur', commitDeckName);
      input.addEventListener('change', commitDeckName);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          input.blur();
        }
      });
    }

    // Clean up function
    return () => {
      // Add cleanup code here if needed
    };
  }, []); // Empty dependency array means this effect runs once on mount

  useEffect(() => {
    // Set up button event listeners
    const newDeckBtn = document.getElementById('new-deck');
    const importDeckBtn = document.getElementById('import-deck');
    const exportDeckBtn = document.getElementById('export-deck');

    newDeckBtn?.addEventListener('click', handleNewDeck);
    importDeckBtn?.addEventListener('click', handleImportDeck);
    exportDeckBtn?.addEventListener('click', handleExportDeck);

    return () => {
      newDeckBtn?.removeEventListener('click', handleNewDeck);
      importDeckBtn?.removeEventListener('click', handleImportDeck);
      exportDeckBtn?.removeEventListener('click', handleExportDeck);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-logo">YG</div>
          <div className="brand-meta">
            <span className="brand-title">Yu-Gi-Oh! Genesys</span>
            <span className="brand-subtitle">Ultra Deck Builder</span>
          </div>
        </div>
        <div className="deck-controls">
          <div className="deck-name-field">
            <label htmlFor="deck-name-input">Deck name</label>
            <input id="deck-name-input" type="text" placeholder="Name your deck" maxLength={40} autoComplete="off" />
          </div>
          <div className="toolbar">
            <button id="new-deck" className="toolbar-btn" data-icon="plus">New deck</button>
            <button id="import-deck" className="toolbar-btn" data-icon="upload">Import</button>
            <button id="export-deck" className="toolbar-btn" data-icon="download">Export</button>
          </div>
        </div>
      </header>

      <main className="main-layout">
        <section className="panel deck-panel">
          <div className="panel-header">
            <div className="panel-title">
              <h2>Deck builder</h2>
              <span className="deck-total" id="deck-total">0 cards</span>
            </div>
            <div className="genesys-pill" title="Total Genesys score">
              <span className="pill-label">Genesys</span>
              <span className="pill-value" id="genesys-points">0</span>
            </div>
          </div>

          <div className="deck-insights">
            <div className="insight-card" data-type="monster">
              <span className="insight-label">Monsters</span>
              <span className="insight-value" id="stat-monster">0</span>
            </div>
            <div className="insight-card" data-type="spell">
              <span className="insight-label">Spells</span>
              <span className="insight-value" id="stat-spell">0</span>
            </div>
            <div className="insight-card" data-type="trap">
              <span className="insight-label">Traps</span>
              <span className="insight-value" id="stat-trap">0</span>
            </div>
          </div>

          <div className="deck-rows">
            <div className="deck-row deck-row-main">
              <div className="deck-row-header">
                <h3>Main deck</h3>
                <span className="deck-counter" id="main-count">[0/60]</span>
              </div>
              <div id="main-deck" className="deck-lane" data-deck="main"></div>
            </div>

            <div className="deck-row deck-row-extra">
              <div className="deck-row-header">
                <h3>Extra deck</h3>
                <span className="deck-counter" id="extra-count">[0/15]</span>
              </div>
              <div id="extra-deck" className="deck-lane" data-deck="extra"></div>
            </div>

            <div className="deck-row deck-row-side">
              <div className="deck-row-header">
                <h3>Side deck</h3>
                <span className="deck-counter" id="side-count">[0/15]</span>
              </div>
              <div id="side-deck" className="deck-lane" data-deck="side"></div>
            </div>
          </div>
        </section>

        <aside className="panel search-panel">
          <div className="panel-header">
            <div className="panel-title">
              <h2>Card database</h2>
              <span className="panel-subtitle">Search and add cards</span>
            </div>
          </div>

          <div className="search-controls">
            <div className="search-bar">
              <span className="material-symbols-outlined search-icon">search</span>
              <input type="text" id="card-search" placeholder="Search cards by name" autoComplete="off" />
            </div>
            <div className="search-filter-actions">
              <button
                id="filters-toggle-btn"
                className="search-control-btn search-control-btn--icon"
                type="button"
                aria-controls="search-filters"
                aria-expanded="false"
              >
                <span className="material-symbols-outlined" aria-hidden="true">tune</span>
                <span className="sr-only">Show filters</span>
              </button>
            </div>
            <div id="search-filters" className="search-filters" hidden>
              <label>
                Type
                <select id="filter-type">
                  <option value="">Any</option>
                  <option value="Effect Monster">Effect Monster</option>
                  <option value="Normal Monster">Normal Monster</option>
                  <option value="Fusion Monster">Fusion Monster</option>
                  <option value="Synchro Monster">Synchro Monster</option>
                  <option value="XYZ Monster">XYZ Monster</option>
                  <option value="Link Monster">Link Monster</option>
                  <option value="Ritual Monster">Ritual Monster</option>
                </select>
              </label>
              <label>
                Attribute
                <select id="filter-attribute">
                  <option value="">Any</option>
                  <option value="LIGHT">LIGHT</option>
                  <option value="DARK">DARK</option>
                  <option value="EARTH">EARTH</option>
                  <option value="WATER">WATER</option>
                  <option value="FIRE">FIRE</option>
                  <option value="WIND">WIND</option>
                  <option value="DIVINE">DIVINE</option>
                </select>
              </label>
              <label>
                Level / Rank
                <select id="filter-level">
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                </select>
              </label>
              <div className="search-filters-footer">
                <button
                  id="filters-clear-btn"
                  className="search-control-btn search-control-btn--ghost"
                  type="button"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          <div id="search-results" className="search-results"></div>
        </aside>
      </main>
    </div>
  );
};

export default Home;