export type FirecrawlBranding = {
  colors?: string[];
  fonts?: string[];
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  logos?: string[];
  personalityTraits?: string[];
  [key: string]: unknown;
};

export type FirecrawlResult = {
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    [key: string]: unknown;
  };
  links?: string[];
  screenshot?: string;
  branding?: FirecrawlBranding;
};

export type MapResult = {
  totalPages: number;
  sections: string[];
  maxDepth: number;
  links: { url: string; title?: string; description?: string }[];
};

export type ExaIntel = {
  industry?: string;
  competitors?: string[];
  employeeCount?: string;
  categories?: string[];
  recentNews?: string[];
  socialProfiles?: { platform: string; url: string; followers?: string }[];
  description?: string;
};

export type SiteIntel = {
  primary: FirecrawlResult;
  map?: MapResult;
  secondaryPages?: { url: string; markdown: string; branding?: FirecrawlBranding }[];
  exa?: ExaIntel;
};

export type AnalysisResult = {
  score: number;
  survivalDays: number;
  categories: Record<string, { score: number; label: string }>;
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  verdict: string;
  brandName: string;
};

export type ScrapedMeta = {
  title: string;
  headingsCount: number;
  linksCount: number;
  imagesCount: number;
  ctasCount: number;
  colors: string[];
  fonts: string[];
  hasLogo: boolean;
  hasScreenshot: boolean;
};

export type SSEEvent = {
  stage: string;
  data?: unknown;
  message?: string;
};
