
export enum ArticleCategory {
  POLITICS = '정치',
  ECONOMY = '경제',
  SOCIETY = '사회',
  ENTERTAINMENT = '연예',
  TECH = 'IT/과학',
  SPORTS = '스포츠',
  OPINION = '오피니언'
}

export interface Article {
  title: string;
  category: ArticleCategory;
  content: string;
  author: string;
  timestamp: string;
  isFakeNews?: boolean;
  isCrazyMode?: boolean;
  isEmergencyMode?: boolean;
  isTimeMachineMode?: boolean;
  targetYear?: string;
  previousArticleContext?: string;
}

export interface Reply {
  username: string;
  content: string;
  likes: number;
}

export interface Comment {
  username: string;
  content: string;
  likes: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  platform: string; // e.g., '뉴스 포털', 'SNS', '커뮤니티'
  replies: Reply[];
}

export interface MediaCoverage {
  mediaName: string;
  headline: string;
}

export interface StockPoint {
  time: string; // "09:00", "11:00" etc
  value: number; // Index value
}

export interface StockSector {
  name: string; // e.g. "Defense", "Bio"
  change: number; // percentage change
}

export interface StockAnalysis {
  indexName: string; // e.g., "KOSPI", "NASDAQ"
  startValue: number;
  endValue: number;
  graphData: StockPoint[];
  affectedSectors: StockSector[];
  marketCommentary: string;
}

export interface ExtraIndices {
  nationalAnxiety: number; // 0-100
  economicStability: number; // 0-100
  angerIndex: number; // 0-100
}

export interface SimulationResult {
  viralityScore: number; // 0 to 100
  reliabilityScore: number; // 0 to 100
  controversyScore: number; // 0 to 100
  publicSentiment: string; // e.g., "Angry", "Excited", "Mixed"
  editorFeedback: string;
  impactSummary: string;
  comments: Comment[];
  otherMediaCoverage: MediaCoverage[];
  viewCountEstimate: number;
  shareCount: number;
  stockAnalysis?: StockAnalysis[]; // Changed to Array to support multiple indices (KOSPI + NASDAQ)
  extraIndices?: ExtraIndices;
}

export const INITIAL_ARTICLE: Article = {
  title: '',
  category: ArticleCategory.SOCIETY,
  content: '',
  author: '김기자',
  timestamp: new Date().toISOString(),
  isFakeNews: false,
  isCrazyMode: false,
  isEmergencyMode: false,
  isTimeMachineMode: false,
  targetYear: new Date().getFullYear().toString(),
  previousArticleContext: undefined
};
