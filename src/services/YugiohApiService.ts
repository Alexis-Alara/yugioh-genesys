import type { Card, ApiResponse, SearchFilters } from '../types/Card';

export class YugiohApiService {
  private static readonly BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

  private static buildUrl(params: Record<string, string | number> = {}): string {
    const searchParams = new URLSearchParams();
    searchParams.append('misc', 'yes');
    searchParams.append('format', 'genesys');
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    return `${this.BASE_URL}?${searchParams.toString()}`;
  }

  /**
   * Fetch all cards from the API (cached after first call)
   */
  static async getAllCards(): Promise<Card[]> {
    try {
      const url = this.buildUrl();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching all cards:', error);
      return [];
    }
  }

  /**
   * Search cards by name
   */
  static async searchCardsByName(name: string): Promise<Card[]> {
    if (!name.trim()) {
      return [];
    }

    try {
      const encodedName = encodeURIComponent(name);
      const url = this.buildUrl({ fname: encodedName });
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No cards found
        }
        throw new Error(`Error searching cards: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching cards by name:', error);
      return [];
    }
  }

  /**
   * Get a specific card by ID
   */
  static async getCardById(id: number): Promise<Card | null> {
    try {
      const url = this.buildUrl({ id });
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      return data.data?.[0] || null;
    } catch (error) {
      console.error('Error fetching card by ID:', error);
      return null;
    }
  }

  /**
   * Advanced search with filters
   */
  static async searchCardsWithFilters(filters: SearchFilters): Promise<Card[]> {
    try {
      const params: Record<string, string | number> = {};

      if (filters.name) {
        params.fname = filters.name;
      }
      if (filters.type) {
        params.type = filters.type;
      }
      if (filters.race) {
        params.race = filters.race;
      }
      if (filters.attribute) {
        params.attribute = filters.attribute;
      }
      if (filters.level !== undefined) {
        params.level = filters.level;
      }
      if (filters.atk !== undefined) {
        params.atk = filters.atk;
      }
      if (filters.def !== undefined) {
        params.def = filters.def;
      }
      if (filters.archetype) {
        params.archetype = filters.archetype;
      }

      const url = this.buildUrl(params);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error searching cards:', error);
      return [];
    }
  }

  /**
   * Get random cards for showcase
   */
  static async getRandomCards(count: number = 40): Promise<Card[]> {
    try {
      // Para cartas aleatorias, usamos offset=0 y num juntos
      const randomOffset = Math.floor(Math.random() * 10) + 1;
      const url = this.buildUrl({ 
        num: count, 
        offset: randomOffset, 
        sort: 'random' 
      });
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      return data.data?.slice(0, count) || [];
    } catch (error) {
      console.error('Error fetching random cards:', error);
      return [];
    }
  }

  /**
   * Obtener cartas con paginación
   */
  static async getCardsWithPagination(limit: number, offset: number = 0): Promise<Card[]> {
    try {
      const url = this.buildUrl({ 
        num: limit, 
        offset: offset 
      });
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching paginated cards:', error);
      return [];
    }
  }
}