import React, { useEffect, useRef } from 'react';
import './style.css';
import { DeckManager } from './services/DeckManager';
import { GenesysService } from './services/GenesysService';
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

  const ensureJsPdf = async (): Promise<any | null> => {
    const existing = (window as any)?.jspdf?.jsPDF;
    if (existing) return existing;
    // Attempt to load from CDN dynamically
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load jsPDF CDN'));
      document.head.appendChild(script);
    }).catch(() => {});
    return (window as any)?.jspdf?.jsPDF || null;
  };

  const buildDecklistPdfDoc = async (deckState: DeckState, genesysPoints: number) => {
    const jsPDF = await ensureJsPdf();
    if (!jsPDF) return null;
      try {
      // Create Letter portrait document (8.5x11in -> 612x792 pt)
      const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const page = { w: 612, h: 792 };
      const margin = 28;

      // Utilities
      const drawHeaderCell = (x: number, y: number, w: number, h: number, label: string) => {
        doc.setFillColor(230);
        doc.rect(x, y, w, h, 'F');
        doc.setDrawColor(120);
        doc.rect(x, y, w, h);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(label, x + 6, y + h / 2 + 3);
      };
      const drawCell = (x: number, y: number, w: number, h: number) => {
        doc.setDrawColor(150);
        doc.rect(x, y, w, h);
      };
      const colHeader = (x: number, y: number, w: number, title: string, alignRight: boolean = false) => {
        doc.setFillColor(235);
        doc.setDrawColor(120);
        doc.rect(x, y, w, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        if (alignRight) {
          doc.text(title, x + w - 6, y + 14, { align: 'right' });
        } else {
          doc.text(title, x + 6, y + 14);
        }
      };

      // Split main deck into monster/spell/trap
      const mainMonsters = deckState.mainDeck.filter((d) => !(d.card.type || '').includes('Spell') && !(d.card.type || '').includes('Trap'));
      const mainSpells = deckState.mainDeck.filter((d) => (d.card.type || '').includes('Spell'));
      const mainTraps = deckState.mainDeck.filter((d) => (d.card.type || '').includes('Trap'));

      const totalMainMon = mainMonsters.reduce((t, c) => t + c.quantity, 0);
      const totalMainSpell = mainSpells.reduce((t, c) => t + c.quantity, 0);
      const totalMainTrap = mainTraps.reduce((t, c) => t + c.quantity, 0);
      const totalMain = deckState.mainDeck.reduce((t, c) => t + c.quantity, 0);
      const totalExtra = deckState.extraDeck.reduce((t, c) => t + c.quantity, 0);
      const totalSide = deckState.sideDeck.reduce((t, c) => t + c.quantity, 0);

      // --- Final Layout Refactor ---
      const topY = margin;
      const lightGray = 230;
      const darkGray = 100;
      const gap = 10;

      // --- TOP ROW: Instructions and Judge box ---
      const topRowH = 36;
      // Left: Instructions
      const instrX = margin; const instrW = 280;
      doc.setLineWidth(1.5); doc.setDrawColor(0);
      doc.setFillColor(lightGray); doc.rect(instrX, topY, instrW, topRowH, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(9);
      doc.text('Please write all card names completely and legibly.', instrX + instrW / 2, topY + 14, { align: 'center' });
      doc.setFont('helvetica','normal');
      doc.text('Please include the quantity for each card.', instrX + instrW / 2, topY + 26, { align: 'center' });

      // Right: Judge Use Only (spans the rest of the width)
      const judgeX = instrX + instrW + gap;
      const judgeW = page.w - margin - judgeX;
      doc.setLineWidth(1.5); doc.setDrawColor(0); doc.rect(judgeX, topY, judgeW, topRowH);
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text('Judge Use Only:', judgeX + 8, topY + 22);
      const letterBoxW = 18, smallBoxW = 14, groupGap = 4;
      let mseX = judgeX + 75;
      ;(['M','S','E'] as const).forEach(t => {
        doc.setFillColor(lightGray); doc.rect(mseX, topY + 8, letterBoxW, 20, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(t, mseX + 5, topY + 22);
        mseX += letterBoxW + 2;
        doc.rect(mseX, topY + 8, smallBoxW, 20); mseX += smallBoxW + 2;
        doc.rect(mseX, topY + 8, smallBoxW, 20); mseX += smallBoxW + groupGap;
      });

      // --- BOTTOM ROW: Player, Event, and Totals ---
      const bottomRowY = topY + topRowH;
      // Define widths and X positions for the three bottom panels
      const playerInfoW = 280;
      const eventInfoW = 200;
      const playerX = margin;
      const eventX = playerX + playerInfoW + gap;
      const totalsX = (eventX + eventInfoW + gap) - 10;
      const totalsW = page.w - margin - totalsX ;

      // Left: Player Info
      const fieldH = 22;
      const labelBoxW = 90;
      let py = bottomRowY;
      const drawPlayerField = (label: string[], h: number) => {
        doc.setLineWidth(1); doc.setDrawColor(darkGray); doc.rect(playerX, py, playerInfoW, h);
        doc.rect(playerX, py, labelBoxW, h);
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        if (label.length > 1) { doc.text(label[0], playerX + 6, py + 10); doc.text(label[1], playerX + 6, py + 20); }
        else { doc.text(label[0], playerX + 6, py + 14); }
        py += h;
      };
      drawPlayerField(['First & Middle', 'Name(s):'], 30);
      drawPlayerField(['Last Name(s):'], fieldH);
      doc.setLineWidth(1); doc.setDrawColor(darkGray); doc.rect(playerX, py, playerInfoW, fieldH);
      doc.rect(playerX, py, labelBoxW, fieldH);
      doc.text('CARD GAME ID:', playerX + 6, py + 14);
      const boxSize = 15, boxGap = 2; let idX = playerX + labelBoxW + 8;
      for (let i = 0; i < 10; i++) { doc.rect(idX, py + 3, boxSize, boxSize); idX += boxSize + boxGap; }

      // Center: Event Info
      py = bottomRowY;
      const drawEventField = (label: string[], h: number) => {
        doc.setLineWidth(1); doc.setDrawColor(darkGray); doc.rect(eventX, py, eventInfoW, h);
        doc.rect(eventX, py, 60, h);
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        if (label.length > 1) { doc.text(label[0], eventX + 4, py + 10); doc.text(label[1], eventX + 4, py + 20); }
        else { doc.text(label[0], eventX + 4, py + 14); }
        py += h;
      };
      drawEventField(['Event','Date:'], 30);
      const dBoxW = 12, dGap = 2; let dx = eventX + 64, dy = bottomRowY + 8;
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(150);
      const drawDateBox = (label: string) => { doc.text(label, dx + 3, dy - 1); doc.setDrawColor(darkGray); doc.rect(dx, dy, dBoxW, 14); dx += dBoxW + dGap; };
      drawDateBox('M'); drawDateBox('M');
      doc.setFont('helvetica','bold'); doc.setTextColor(0); doc.text('/', dx, dy + 10); dx += 6;
      drawDateBox('D'); drawDateBox('D');
      doc.setFont('helvetica','bold'); doc.setTextColor(0); doc.text('/', dx, dy + 10); dx += 6;
      drawDateBox('Y'); drawDateBox('Y'); drawDateBox('Y'); drawDateBox('Y');
      drawEventField(['Country of','Residency:'], fieldH);
      drawEventField(['Event','Name:'], fieldH);

      // Right: Last Name Initial & Main Deck Total
      const bottomRowH = 30 + fieldH + fieldH;
      doc.setLineWidth(1.5); doc.setDrawColor(0); doc.rect(totalsX, bottomRowY, totalsW, bottomRowH);
      doc.setFont('helvetica','normal'); doc.setFontSize(7);      doc.text('Last Name Initial', totalsX + totalsW / 2, bottomRowY + 12, { align: 'center' });
      const initialBoxH = 22;
      

      const totalLabelsY = bottomRowY + 16 + initialBoxH + 10;
      const totalValuesY = totalLabelsY + 15;
      const halfTotalsW = (totalsW - 16) / 2;
      const mainTotalX = totalsX + 8;
      const pointTotalX = mainTotalX + halfTotalsW;

      // Labels
      doc.setFont('helvetica','normal'); doc.setFontSize(6);
      doc.text('Main Deck', mainTotalX + halfTotalsW / 2, totalLabelsY, { align: 'center' });
      doc.text('Total', mainTotalX + halfTotalsW / 2, totalLabelsY + 6, { align: 'center' });
      doc.text('Point', pointTotalX + halfTotalsW / 2, totalLabelsY, { align: 'center' });
      doc.text('Total', pointTotalX + halfTotalsW / 2, totalLabelsY + 6, { align: 'center' });


      // Values
      doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text(String(totalMain), mainTotalX + halfTotalsW / 2, totalValuesY + 6, { align: 'center' });
      doc.text(String(genesysPoints), pointTotalX + halfTotalsW / 2, totalValuesY + 6, { align: 'center' });

      // Main Deck area: 3 columns (Monsters, Spells, Traps)
      const afterTopY = topY + 36 + 30 + 22 + 22 + 10;
      const mainTop = afterTopY + 10;
      const mainH = 320;
      const qtyColW = 28;
      const ptsColW = 28; // placeholder PTS column
      const colGap = 8;
      const totalW = page.w - margin * 2;
      const threeColW = (totalW - colGap * 2) / 3;

      type Row = { name: string; qty: number };
      const toRows = (arr: {card:any; quantity:number}[]): Row[] => arr.map((d) => ({ name: d.card.name, qty: d.quantity }));
      const monRows = toRows(mainMonsters);
      const spellRows = toRows(mainSpells);
      const trapRows = toRows(mainTraps);

      const getTotalPoints = (cards: {card:any; quantity:number}[]) => cards.reduce((sum, d) => sum + GenesysService.getCardPoints(d.card.name) * d.quantity, 0);
      const totalMonPoints = getTotalPoints(mainMonsters);
      const totalSpellPoints = getTotalPoints(mainSpells);
      const totalTrapPoints = getTotalPoints(mainTraps);

      const drawCardName = (doc: any, name: string, x: number, y: number, maxWidth: number) => {
        const defaultFontSize = 7;
        doc.setFontSize(defaultFontSize);

        let textWidth = doc.getTextWidth(name);

        if (textWidth > maxWidth) {
          const newSize = (maxWidth / textWidth) * defaultFontSize;
          doc.setFontSize(newSize);
        }

        doc.text(name, x, y);
        doc.setFontSize(defaultFontSize); // Reset font size
      };

      const drawDeckColumn = (x: number, title: string, rows: Row[], totalQty: number, totalPts: number) => {
        // Header bar
        colHeader(x, mainTop, threeColW, title.toUpperCase());
        // Table header: QTY | card name | PTS
        const tableY = mainTop + 20;
        drawHeaderCell(x, tableY, qtyColW, 20, 'QTY');
        drawHeaderCell(x + qtyColW, tableY, threeColW - qtyColW - ptsColW, 20, '');
        drawHeaderCell(x + threeColW - ptsColW, tableY, ptsColW, 20, 'PTS');
        // Rows
        const rowH = 18;
        let ry = tableY + 20;
        const maxRows = Math.floor((mainH - 60) / rowH); // leave space for total row
        for (let i = 0; i < maxRows; i++) {
          drawCell(x, ry, qtyColW, rowH);
          drawCell(x + qtyColW, ry, threeColW - qtyColW - ptsColW, rowH);
          drawCell(x + threeColW - ptsColW, ry, ptsColW, rowH);
          const row = rows[i];
          if (row) {
            const cardPoints = GenesysService.getCardPoints(row.name);
            const totalRowPoints = cardPoints * row.qty;
            doc.setFont('helvetica','normal');
            doc.setFontSize(7);
            doc.text(String(row.qty), x + qtyColW / 2, ry + 12, { align: 'center' });
            drawCardName(doc, row.name, x + qtyColW + 4, ry + 12, threeColW - qtyColW - ptsColW - 8);
            doc.text(String(totalRowPoints), x + threeColW - ptsColW / 2, ry + 12, { align: 'center' });
          }
          ry += rowH;
        }
        // Total row
        const totalRowY = ry;
        const totalRowH = 14;
        const totalQtyBoxW = qtyColW;
        const totalPtsBoxW = ptsColW;
        const totalLabelW = threeColW - totalQtyBoxW - totalPtsBoxW;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setDrawColor(darkGray);

        // Qty Box
        drawCell(x, totalRowY, totalQtyBoxW, totalRowH);
        doc.text(String(totalQty), x + totalQtyBoxW / 2, totalRowY + 10, { align: 'center' });

        // Label Box
        drawCell(x + totalQtyBoxW, totalRowY, totalLabelW, totalRowH);
        doc.text(`<<< TOTAL ${title.toUpperCase()}`, x + totalQtyBoxW + totalLabelW / 2, totalRowY + 10, { align: 'center' });

        // Points Box
        drawCell(x + totalQtyBoxW + totalLabelW, totalRowY, totalPtsBoxW, totalRowH);
        doc.text(String(totalPts), x + totalQtyBoxW + totalLabelW + totalPtsBoxW / 2, totalRowY + 10, { align: 'center' });
      };

      drawDeckColumn(margin, 'Monster Cards', monRows, totalMainMon, totalMonPoints);
      drawDeckColumn(margin + threeColW + colGap, 'Spell Cards', spellRows, totalMainSpell, totalSpellPoints);
      drawDeckColumn(margin + (threeColW + colGap) * 2, 'Trap Cards', trapRows, totalMainTrap, totalTrapPoints);

      // Divider bar for totals of main overall
      

      // Side and Extra Deck blocks
      const subTop = mainTop + mainH + 10;
      const subH = 300;

      const totalSidePoints = getTotalPoints(deckState.sideDeck);
      const totalExtraPoints = getTotalPoints(deckState.extraDeck);
      const sideRows = toRows(deckState.sideDeck);
      const extraRows = toRows(deckState.extraDeck);

      const drawSubDeck = (x: number, title: string, rows: Row[], totalQty: number, totalPts: number) => {
        colHeader(x, subTop, threeColW, title.toUpperCase());
        const tableY = subTop + 20;
        const rowH = 18;
        let ry = tableY;

        // Table header
        drawHeaderCell(x, tableY, qtyColW, 20, 'QTY');
        drawHeaderCell(x + qtyColW, tableY, threeColW - qtyColW - ptsColW, 20, '');
        drawHeaderCell(x + threeColW - ptsColW, tableY, ptsColW, 20, 'PTS');
        ry += 20;

        const maxRows = Math.floor((subH - 60) / rowH);
        for (let i = 0; i < maxRows; i++) {
          drawCell(x, ry, qtyColW, rowH);
          drawCell(x + qtyColW, ry, threeColW - qtyColW - ptsColW, rowH);
          drawCell(x + threeColW - ptsColW, ry, ptsColW, rowH);
          const row = rows[i];
          if (row) {
            const cardPoints = GenesysService.getCardPoints(row.name);
            const totalRowPoints = cardPoints * row.qty;
            doc.setFont('helvetica','normal');
            doc.setFontSize(7);
            doc.text(String(row.qty), x + qtyColW / 2, ry + 12, { align: 'center' });
            drawCardName(doc, row.name, x + qtyColW + 4, ry + 12, threeColW - qtyColW - ptsColW - 8);
            doc.text(String(totalRowPoints), x + threeColW - ptsColW / 2, ry + 12, { align: 'center' });
          }
          ry += rowH;
        }

        // Total row
        const totalRowY = ry;
        const totalRowH = 14;
        const totalQtyBoxW = qtyColW;
        const totalPtsBoxW = ptsColW;
        const totalLabelW = threeColW - totalQtyBoxW - totalPtsBoxW;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setDrawColor(darkGray);

        drawCell(x, totalRowY, totalQtyBoxW, totalRowH);
        doc.text(String(totalQty), x + totalQtyBoxW / 2, totalRowY + 10, { align: 'center' });

        drawCell(x + totalQtyBoxW, totalRowY, totalLabelW, totalRowH);
        doc.text(`<<< TOTAL ${title.toUpperCase()}`, x + totalQtyBoxW + totalLabelW / 2, totalRowY + 10, { align: 'center' });

        drawCell(x + totalQtyBoxW + totalLabelW, totalRowY, totalPtsBoxW, totalRowH);
        doc.text(String(totalPts), x + totalQtyBoxW + totalLabelW + totalPtsBoxW / 2, totalRowY + 10, { align: 'center' });
      };

      drawSubDeck(margin, 'Side Deck', sideRows, totalSide, totalSidePoints);
      drawSubDeck(margin + threeColW + colGap, 'Extra Deck', extraRows, totalExtra, totalExtraPoints);

      const judgeColumnX = margin + (threeColW + colGap) * 2;
      colHeader(judgeColumnX, subTop, threeColW, 'For Judge Use Only', true);

      const drawJudgeBlock = (y: number, h: number, topLabel: string) => {
        const blockX = judgeColumnX;
        const blockW = threeColW;
        const rowH1 = 20;
        const rowH2 = 20;
        const rowH3 = h - rowH1 - rowH2;

        doc.setDrawColor(darkGray);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);

        // Main container for the block
        doc.rect(blockX, y, blockW, h);

        // Row 1
        let currentY = y;
        doc.rect(blockX, currentY, blockW, rowH1);
        doc.text(topLabel, blockX + 4, currentY + 13);

        // Row 2
        currentY += rowH1;
        const halfW = blockW / 2;
        doc.rect(blockX, currentY, blockW, rowH2);
        doc.line(blockX + halfW, currentY, blockX + halfW, currentY + rowH2); // Vertical divider
        doc.text('Judge Initials:', blockX + 4, currentY + 13);
        doc.text('Infraction:', blockX + halfW + 4, currentY + 13);

        // Row 3
        currentY += rowH2;
        doc.rect(blockX, currentY, blockW, rowH3);
        doc.text('Description:', blockX + 4, currentY + 13);
      };

      const blockH = (subH - 20) / 3; // 20 is header height
      let blockY = subTop + 20;

      drawJudgeBlock(blockY, blockH, 'Deck List Checked?');
      blockY += blockH;
      drawJudgeBlock(blockY, blockH, 'Deck Check Round:');
      blockY += blockH;
      drawJudgeBlock(blockY, blockH, 'Deck Check Round:');
      

      return doc;
    } catch (err) {
      console.error('Error generating PDF', err);
      return null;
    }
  };


  const handleDownloadPdf = async () => {
    const deckState = deckManagerRef.current.getDeckState();
    const deckName = deckState.name && deckState.name.trim() ? deckState.name.trim() : 'My Deck';
    const genesysPoints = deckManagerRef.current.getGenesysPoints();
    const doc = await buildDecklistPdfDoc(deckState, genesysPoints);
    if (!doc) {
      showMessage('PDF generator not loaded. Please try again in a moment.', 'error');
      return;
    }
    doc.save(`${deckName || 'deck'}.pdf`);
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
    // Agregar canonical URL
    const canonicalUrl = 'https://yugiohgenesys.com.mx/';
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Preconnect a dominios externos
    const preconnectLinks = [
      'https://yugiohgenesys.com.mx',
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net'
    ];

    preconnectLinks.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      document.head.appendChild(link);
    });

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
    const downloadPdfBtn = document.getElementById('download-pdf');

    newDeckBtn?.addEventListener('click', handleNewDeck);
    importDeckBtn?.addEventListener('click', handleImportDeck);
    exportDeckBtn?.addEventListener('click', handleExportDeck);
    downloadPdfBtn?.addEventListener('click', handleDownloadPdf);

    return () => {
      newDeckBtn?.removeEventListener('click', handleNewDeck);
      importDeckBtn?.removeEventListener('click', handleImportDeck);
      exportDeckBtn?.removeEventListener('click', handleExportDeck);
      downloadPdfBtn?.removeEventListener('click', handleDownloadPdf);
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
            <button id="download-pdf" className="toolbar-btn" data-icon="save">Download PDF</button>
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