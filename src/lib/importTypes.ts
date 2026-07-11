export const IMPORT_LANGUAGES = ['original', 'en', 'fr', 'de', 'es'] as const;
export type ImportLanguage = (typeof IMPORT_LANGUAGES)[number];

export const IMPORT_CATEGORY_IDS = [
  'produce-fruit', 'produce-veg', 'dairy-eggs', 'meat-seafood', 'bakery', 'pantry',
  'frozen', 'beverages', 'snacks', 'breakfast', 'household', 'personal-care', 'baby',
  'pet', 'other',
] as const;
export type ImportCategoryId = (typeof IMPORT_CATEGORY_IDS)[number];
export type ImportConfidence = 'source' | 'high' | 'medium' | 'low';

export interface ImportedProduct {
  id: string;
  originalName: string;
  name: string;
  ean13: string;
  department: string;
  category: ImportCategoryId;
  confidence: ImportConfidence;
  quantity: number;
  unitPrice?: number;
  selected: boolean;
}

export interface ParsedInvoice {
  retailer: string;
  currency: string;
  invoiceDate?: string;
  suggestedListName: string;
  pageCount: number;
  declaredUnits?: number;
  products: ImportedProduct[];
}

export interface EnrichmentInput {
  id: string;
  originalName: string;
  ean13: string;
  department: string;
}

export interface EnrichedProduct {
  id: string;
  name: string;
  category: ImportCategoryId;
  confidence: Exclude<ImportConfidence, 'source'>;
}
