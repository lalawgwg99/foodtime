
export interface ExpiryAnalysis {
  productName: string;
  origin: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  daysRemaining: number | null;
  rawTextFound: string;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  dateAmbiguityWarning?: string;
  groundingSources?: { title: string; uri: string }[];
  isFoodProduct: boolean; // 新增：判斷是否為食品包裝
}

export interface ScannedProduct extends ExpiryAnalysis {
  id: string;
  scannedAt: number;
}

export interface AppState {
  batchResults: ExpiryAnalysis[];
  isAnalyzing: boolean;
  error: string | null;
  view: 'scanner' | 'history';
  savedProducts: ScannedProduct[];
  notificationsEnabled: boolean;
}
