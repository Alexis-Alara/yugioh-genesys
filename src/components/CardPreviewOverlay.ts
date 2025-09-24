interface PreviewData {
  name: string;
  image: string;
  attribute?: string;
  type?: string;
  race?: string;
  levelText?: string;
  statsText?: { atk?: string; def?: string };
  desc?: string;
}

export class CardHoverPreview {
  private overlay: HTMLElement;
  private imageEl: HTMLImageElement;
  private nameEl: HTMLElement;
  private attributeChip: HTMLElement;
  private levelChip: HTMLElement;
  private typeChip: HTMLElement;
  private raceChip: HTMLElement;
  private statsContainer: HTMLElement;
  private dividerEl: HTMLElement;
  private atkEl: HTMLElement;
  private defEl: HTMLElement;
  private descEl: HTMLElement;
  private activeTarget: HTMLElement | null = null;

  constructor() {
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);

    this.imageEl = this.overlay.querySelector('.preview-image > img') as HTMLImageElement;
    this.nameEl = this.overlay.querySelector('.preview-name') as HTMLElement;
    this.attributeChip = this.overlay.querySelector('.chip-attribute') as HTMLElement;
    this.levelChip = this.overlay.querySelector('.chip-level') as HTMLElement;
    this.typeChip = this.overlay.querySelector('.chip-type') as HTMLElement;
    this.raceChip = this.overlay.querySelector('.chip-race') as HTMLElement;
    this.statsContainer = this.overlay.querySelector('.preview-stats') as HTMLElement;
    this.dividerEl = this.overlay.querySelector('.preview-stats .divider') as HTMLElement;
    this.atkEl = this.overlay.querySelector('.stat-atk') as HTMLElement;
    this.defEl = this.overlay.querySelector('.stat-def') as HTMLElement;
    this.descEl = this.overlay.querySelector('.preview-desc') as HTMLElement;

    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseout', this.handleMouseOut, true);
    window.addEventListener('scroll', this.handleViewportChange, true);
    window.addEventListener('resize', this.handleViewportChange);
  }

  private createOverlay(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-preview-overlay';
    wrapper.innerHTML = `
      <div class="preview-shell">
        <div class="preview-image">
          <img src="" alt="Vista previa de carta" />
        </div>
        <div class="preview-content">
          <div class="preview-header">
            <h4 class="preview-name">Carta</h4>
            <div class="preview-chips">
              <span class="preview-chip chip-attribute" hidden></span>
              <span class="preview-chip chip-level" hidden></span>
              <span class="preview-chip chip-type" hidden></span>
              <span class="preview-chip chip-race" hidden></span>
            </div>
          </div>
          <div class="preview-stats" hidden>
            <span class="preview-stat stat-atk"></span>
            <span class="divider"></span>
            <span class="preview-stat stat-def"></span>
          </div>
          <p class="preview-desc"></p>
        </div>
      </div>
    `;
    return wrapper;
  }

  private handleMouseOver = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest('.card-hover-target') as HTMLElement | null;

    if (!target) {
      return;
    }

    if (this.activeTarget !== target) {
      this.activeTarget = target;
      const data = this.extractData(target);
      this.populate(data);
      this.show();
      this.positionOverlay(event);
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.activeTarget) {
      return;
    }
    this.positionOverlay(event);
  };

  private handleMouseOut = (event: MouseEvent): void => {
    const fromTarget = (event.target as HTMLElement).closest('.card-hover-target');
    const toTarget = (event.relatedTarget as HTMLElement | null)?.closest('.card-hover-target') || null;

    if (fromTarget && fromTarget === this.activeTarget && toTarget !== this.activeTarget) {
      this.activeTarget = null;
      this.hide();
    }
  };

  private handleViewportChange = (): void => {
    this.activeTarget = null;
    this.hide();
  };

  private show = (): void => {
    this.overlay.classList.add('is-active');
  };

  private hide = (): void => {
    this.overlay.classList.remove('is-active');
  };

  private clearOverlay(): void {
    // Limpiar todas las clases de estado
    this.overlay.classList.remove('has-stats');

    // Ocultar todos los elementos que pueden estar visibles
    this.statsContainer.hidden = true;
    this.attributeChip.hidden = true;
    this.levelChip.hidden = true;
    this.typeChip.hidden = true;
    this.raceChip.hidden = true;

    // Limpiar contenido de texto
    this.nameEl.textContent = '';
    this.atkEl.textContent = '';
    this.defEl.textContent = '';
    this.descEl.textContent = '';
    this.atkEl.hidden = true;
    this.defEl.hidden = true;
    this.dividerEl.hidden = true;

    // Limpiar imagen
    this.imageEl.src = '';
    this.imageEl.alt = '';
  }

  private positionOverlay(event: MouseEvent): void {
    const offset = 28;
    const viewportPadding = 16;
    const width = this.overlay.offsetWidth || 560;
    const height = this.overlay.offsetHeight || 520;

    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + width > window.innerWidth - viewportPadding) {
      left = event.clientX - width - offset;
    }

    if (top + height > window.innerHeight - viewportPadding) {
      top = event.clientY - height - offset;
    }

    if (left < viewportPadding) {
      left = viewportPadding;
    }
    if (top < viewportPadding) {
      top = viewportPadding;
    }

    this.overlay.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }

  private extractData(target: HTMLElement): PreviewData {
    const {
      cardName,
      cardType,
      cardRace,
      cardAttribute,
      cardLevel,
      cardLink,
      cardScale,
      cardAtk,
      cardDef,
      cardDesc,
      cardImage
    } = target.dataset as Record<string, string | undefined>;

    const levelText = this.buildLevelText(cardLevel, cardLink, cardScale, cardType);
    const stats = this.buildStats(cardAtk, cardDef);

    return {
      name: cardName || 'Carta',
      image: cardImage || '',
      attribute: cardAttribute,
      type: cardType,
      race: cardRace,
      levelText,
      statsText: stats,
      desc: cardDesc ? cardDesc : ''
    };
  }

  private buildLevelText(
    level?: string,
    link?: string,
    scale?: string,
    type?: string
  ): string | undefined {
    if (link && Number(link) > 0) {
      return `LINK-${link}`;
    }

    if (level && Number(level) > 0) {
      return `LV.${level}`;
    }

    if (scale && Number(scale) > 0 && type && type.includes('Pendulum')) {
      return `ESC.${scale}`;
    }

    return undefined;
  }

  private buildStats(atk?: string, def?: string): { atk?: string; def?: string } | undefined {
    const hasAtk = atk !== undefined && atk !== '' && atk !== 'undefined';
    const hasDef = def !== undefined && def !== '' && def !== 'undefined';

    if (!hasAtk && !hasDef) {
      return undefined;
    }

    return {
      atk: hasAtk ? `ATK ${atk}` : undefined,
      def: hasDef ? `DEF ${def}` : undefined
    };
  }

  private populate(data: PreviewData): void {
    // Limpiar completamente el estado anterior
    this.clearOverlay();

    this.nameEl.textContent = data.name;

    const fallbackImage = 'https://static-ygoprodeck.com/pics/placeholder.jpg';
    this.imageEl.src = data.image || fallbackImage;
    this.imageEl.alt = data.name;

    this.applyChip(this.attributeChip, data.attribute);
    this.applyChip(this.levelChip, data.levelText);
    this.applyChip(this.typeChip, data.type);
    this.applyChip(this.raceChip, data.race);

    if (data.statsText && (data.statsText.atk || data.statsText.def)) {
      this.statsContainer.hidden = false;
      this.atkEl.textContent = data.statsText.atk || '';
      this.atkEl.hidden = !data.statsText.atk;
      this.defEl.textContent = data.statsText.def || '';
      this.defEl.hidden = !data.statsText.def;
      const showDivider = Boolean(data.statsText.atk && data.statsText.def);
      this.dividerEl.hidden = !showDivider;
      this.overlay.classList.add('has-stats');
    } else {
      this.statsContainer.hidden = true;
      this.overlay.classList.remove('has-stats');
    }

    const normalizedDesc = data.desc ? this.truncate(data.desc.replace(/\s+/g, ' ').trim(), 420) : '';
    this.descEl.textContent = normalizedDesc;
  }

  private applyChip(element: HTMLElement, value?: string): void {
    if (!value) {
      element.hidden = true;
      element.textContent = '';
      return;
    }

    element.hidden = false;
    element.textContent = value;
  }

  private truncate(value: string, limit: number): string {
    if (value.length <= limit) {
      return value;
    }
    return `${value.slice(0, limit - 3)}...`;
  }
}
