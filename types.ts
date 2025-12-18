
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
  storageDuration?: string; // 新增：保存期限 (如 "12個月")
  groundingSources?: { title: string; uri: string }[];
  isFoodProduct: boolean;
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
  analysisProgress?: string;
}

