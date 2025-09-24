import type { Card, ApiResponse, SearchFilters } from '../types/Card';

export class YugiohApiService {
  private static readonly BASE_URL = 'https://db.ygoprodeck.com/api/v7';
  private static readonly CARDINFO_ENDPOINT = '/cardinfo.php';
  
  // Cache for storing fetched cards to reduce API calls
  private static cardCache: Map<number, Card> = new Map();
  private static allCardsCache: Card[] | null = null;

  /**
   * Fetch all cards from the API (cached after first call)
   */
  static async getAllCards(): Promise<Card[]> {
    if (this.allCardsCache) {
      return this.allCardsCache;
    }

    try {
      const response = await fetch(`${this.BASE_URL}${this.CARDINFO_ENDPOINT}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching cards: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      this.allCardsCache = data.data;
      
      // Store individual cards in cache
      data.data.forEach(card => {
        this.cardCache.set(card.id, card);
      });
      
      return data.data;
    } catch (error) {
      console.error('Error fetching all cards:', error);
      throw error;
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
      const response = await fetch(
        `${this.BASE_URL}${this.CARDINFO_ENDPOINT}?fname=${encodedName}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No cards found
        }
        throw new Error(`Error searching cards: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Cache the results
      data.data.forEach(card => {
        this.cardCache.set(card.id, card);
      });
      
      return data.data;
    } catch (error) {
      console.error('Error searching cards by name:', error);
      return [];
    }
  }

  /**
   * Get a specific card by ID
   */
  static async getCardById(id: number): Promise<Card | null> {
    // Check cache first
    if (this.cardCache.has(id)) {
      return this.cardCache.get(id)!;
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}${this.CARDINFO_ENDPOINT}?id=${id}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Card not found
        }
        throw new Error(`Error fetching card: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      const card = data.data[0];
      
      if (card) {
        this.cardCache.set(card.id, card);
      }
      
      return card || null;
    } catch (error) {
      console.error('Error fetching card by ID:', error);
      return null;
    }
  }

  /**
   * Advanced search with filters
   */
  static async searchCardsWithFilters(filters: SearchFilters): Promise<Card[]> {
    const params = new URLSearchParams();
    
    if (filters.name) {
      params.append('fname', filters.name);
    }
    if (filters.type) {
      params.append('type', filters.type);
    }
    if (filters.race) {
      params.append('race', filters.race);
    }
    if (filters.attribute) {
      params.append('attribute', filters.attribute);
    }
    if (filters.level) {
      params.append('level', filters.level.toString());
    }
    if (filters.atk !== undefined) {
      params.append('atk', filters.atk.toString());
    }
    if (filters.def !== undefined) {
      params.append('def', filters.def.toString());
    }
    if (filters.archetype) {
      params.append('archetype', filters.archetype);
    }

    try {
      const response = await fetch(
        `${this.BASE_URL}${this.CARDINFO_ENDPOINT}?${params.toString()}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No cards found
        }
        throw new Error(`Error searching cards: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Cache the results
      data.data.forEach(card => {
        this.cardCache.set(card.id, card);
      });
      
      return data.data;
    } catch (error) {
      console.error('Error searching cards with filters:', error);
      return [];
    }
  }

  /**
   * Get random cards for showcase
   */
  static async getRandomCards(count: number = 20): Promise<Card[]> {
    try {
      const response = await fetch(
        `${this.BASE_URL}${this.CARDINFO_ENDPOINT}?num=${count}&offset=${Math.floor(Math.random() * 1000)}`
      );
      
      if (!response.ok) {
        throw new Error(`Error fetching random cards: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Cache the results
      data.data.forEach(card => {
        this.cardCache.set(card.id, card);
      });
      
      return data.data;
    } catch (error) {
      console.error('Error fetching random cards:', error);
      return [];
    }
  }

  /**
   * Clear the cache (useful for memory management)
   */
  static clearCache(): void {
    this.cardCache.clear();
    this.allCardsCache = null;
  }
}