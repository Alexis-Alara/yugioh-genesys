import type { Card } from '../types/Card';

export class GenesysService {
  private static cardCache = new Map<string, number>();
  private static cacheLoaded = false;

  /**
   * Cargar cache desde localStorage
   */
  private static loadCache(): void {
    if (this.cacheLoaded) return;
    
    try {
      const cached = localStorage.getItem('genesysPointsCache');
      if (cached) {
        const data = JSON.parse(cached);
        Object.entries(data).forEach(([name, points]) => {
          this.cardCache.set(name, points as number);
        });
      }
    } catch (error) {
      console.warn('Error loading Genesys cache:', error);
    }
    
    this.cacheLoaded = true;
  }

  /**
   * Guardar cache en localStorage
   */
  private static saveCache(): void {
    try {
      const data: Record<string, number> = {};
      this.cardCache.forEach((points, name) => {
        data[name] = points;
      });
      localStorage.setItem('genesysPointsCache', JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving Genesys cache:', error);
    }
  }

  /**
   * Get the Genesys point value for a card from misc_info
   */
  static getCardPoints(card: Card | string): number {
    this.loadCache();

    // Si recibimos solo el nombre de la carta, buscar en cache primero
    if (typeof card === 'string') {
      const cardName = card;
      
      // Buscar en cache
      if (this.cardCache.has(cardName)) {
        return this.cardCache.get(cardName)!;
      }

      // Si no está en cache, buscar en la API
      this.fetchCardPointsByName(cardName);
      return 0; // Retornar 0 mientras se carga
    }

    // Si es un objeto Card
    if (card.misc_info && card.misc_info.length > 0) {
      const genesysPoints = card.misc_info[0].genesys_points;
      if (typeof genesysPoints === 'number') {
        // Guardar en cache usando el nombre
        this.cardCache.set(card.name, genesysPoints);
        this.saveCache();
        return genesysPoints;
      }
    }

    // Buscar en cache por nombre como fallback
    if (this.cardCache.has(card.name)) {
      return this.cardCache.get(card.name)!;
    }

    return 0;
  }

  /**
   * Buscar puntos por nombre de carta en la API
   */
  private static async fetchCardPointsByName(cardName: string): Promise<void> {
    try {
      const { YugiohApiService } = await import('./YugiohApiService');
      const cards = await YugiohApiService.searchCardsWithFilters({ name: cardName });
      
      // Buscar carta exacta por nombre
      const exactCard = cards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
      
      if (exactCard && exactCard.misc_info && exactCard.misc_info.length > 0) {
        const genesysPoints = exactCard.misc_info[0].genesys_points;
        if (typeof genesysPoints === 'number') {
          this.cardCache.set(cardName, genesysPoints);
          this.saveCache();
          // Notificar que se actualizó la información
          this.notifyPointsUpdated();
        }
      }
    } catch (error) {
      console.warn(`Error fetching Genesys points for card "${cardName}":`, error);
    }
  }

  /**
   * Notificar a los listeners que se actualizaron los puntos
   */
  private static notifyPointsUpdated(): void {
    window.dispatchEvent(new CustomEvent('genesysPointsUpdated'));
  }

  /**
   * Check if a card has Genesys points assigned
   */
  static hasGenesysPoints(card: Card): boolean {
    return this.getCardPoints(card) > 0;
  }

  /**
   * Get the point value color based on the points
   */
  static getPointsColor(points: number): string {
    if (points === 0) return '#ffffffff'; // Gray for 0 points
    if (points <= 10) return '#ffffffff'; // Green for low points
    if (points <= 33) return '#ffffffff'; // Yellow for medium points
    if (points <= 66) return '#ffffffff'; // Orange for high points
    return '#ffffffff'; // Red for very high points (67+)
  }

  /**
   * Get point tier description
   */
  static getPointTier(points: number): string {
    if (points === 0) return 'Sin puntos';
    if (points <= 10) return 'Bajo';
    if (points <= 33) return 'Medio';
    if (points <= 66) return 'Alto';
    return 'Muy Alto';
  }

  /**
   * Clear the cache (useful for testing)
   */
  static clearCache(): void {
    this.cardCache.clear();
    localStorage.removeItem('genesysPointsCache');
    this.cacheLoaded = false;
  }

  /**
   * Backward compatibility: get points by card name (deprecated)
   * @deprecated Use getCardPoints with Card object instead
   */
  static getCardPointsByName(cardName: string): number {
    return this.getCardPoints(cardName);
  }
}