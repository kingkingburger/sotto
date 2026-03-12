export type PriceSource = 'kamis' | 'consumer' | 'naver' | 'static';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface PriceResult {
  price: number;
  unit: string;
  source: PriceSource;
  confidence: number;
  trend?: { direction: TrendDirection; changePercent: number };
}
