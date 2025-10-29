import type { Card } from '../types/Card';

type PriceSourceKey =
  | 'cardmarket_price'
  | 'tcgplayer_price'
  | 'ebay_price'
  | 'amazon_price'
  | 'coolstuffinc_price';

const PRICE_FIELDS: Array<{ key: PriceSourceKey; label: string }> = [
  { key: 'cardmarket_price', label: 'Cardmarket' },
  { key: 'tcgplayer_price', label: 'TCGplayer' },
  { key: 'ebay_price', label: 'eBay' },
  { key: 'amazon_price', label: 'Amazon' },
  { key: 'coolstuffinc_price', label: 'CoolStuffInc' },
];

export interface CardPriceSource {
  key: PriceSourceKey;
  label: string;
  value: number;
}

export interface CardPriceInfo {
  best: CardPriceSource;
  sources: CardPriceSource[];
}

const USD_CURRENCY = 'USD';

export function formatCurrency(value: number, currency: string = USD_CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getCardPriceInfo(card: Card): CardPriceInfo | null {
  const priceData = card.card_prices?.[0];
  if (!priceData) {
    return null;
  }

  const sources: CardPriceSource[] = [];

  for (const { key, label } of PRICE_FIELDS) {
    const rawValue = (priceData as Record<string, string | undefined>)[key];
    if (!rawValue) {
      continue;
    }

    const numericValue = Number.parseFloat(rawValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      continue;
    }

    sources.push({
      key,
      label,
      value: numericValue,
    });
  }

  if (sources.length === 0) {
    return null;
  }

  sources.sort((a, b) => a.value - b.value);

  return {
    best: sources[0],
    sources,
  };
}

export function getCardBestPrice(card: Card): number {
  const info = getCardPriceInfo(card);
  return info ? info.best.value : 0;
}
