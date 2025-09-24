// Interfaces based on YGOProDeck API v7 response structure

export interface CardImage {
  id: number;
  url: string;
  url_small: string;
  url_cropped?: string;
}

export interface CardPrice {
  cardmarket_price?: string;
  tcgplayer_price?: string;
  ebay_price?: string;
  amazon_price?: string;
  coolstuffinc_price?: string;
}

export interface CardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
  set_price: string;
}

export interface Card {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  archetype?: string;
  scale?: number;
  linkval?: number;
  linkmarkers?: string[];
  card_sets?: CardSet[];
  card_images: CardImage[];
  card_prices?: CardPrice[];
}

// Response from the API
export interface ApiResponse {
  data: Card[];
}

// Deck types
export const DeckType = {
  MAIN: 'main',
  EXTRA: 'extra',
  SIDE: 'side'
} as const;

export type DeckTypeValue = typeof DeckType[keyof typeof DeckType];

export interface DeckCard {
  card: Card;
  quantity: number;
}

export interface DeckState {
  mainDeck: DeckCard[];
  extraDeck: DeckCard[];
  sideDeck: DeckCard[];
  name?: string;
  genesysPoints?: number;
}

// Search filters
export interface SearchFilters {
  name?: string;
  type?: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
  archetype?: string;
}

// Card type constants
export const EXTRA_DECK_TYPES = [
  'Fusion Monster',
  'Synchro Monster', 
  'XYZ Monster',
  'Link Monster',
  'Pendulum Effect Fusion Monster',
  'Synchro Pendulum Effect Monster',
  'XYZ Pendulum Effect Monster'
];

export const MAIN_DECK_TYPES = [
  'Normal Monster',
  'Effect Monster',
  'Flip Effect Monster',
  'Flip Tuner Effect Monster',
  'Gemini Monster',
  'Normal Tuner Monster',
  'Pendulum Effect Monster',
  'Pendulum Flip Effect Monster',
  'Pendulum Normal Monster',
  'Pendulum Tuner Effect Monster',
  'Ritual Effect Monster',
  'Ritual Monster',
  'Spirit Monster',
  'Toon Monster',
  'Tuner Monster',
  'Union Effect Monster',
  'Spell Card',
  'Trap Card'
];