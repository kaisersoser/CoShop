/* ============================================================================
   CoShop — Catalog Index & Search
   ----------------------------------------------------------------------------
   Loads the bundled product catalog and builds in-memory indexes for fast
   autocomplete and fuzzy matching. Pure TypeScript (no DOM / framework deps)
   so it is reusable by the web UI, future voice/OCR pipelines, and a possible
   Expo build.
   ========================================================================== */

import rawCatalog from '../data/catalog.json';
import { OTHER_CATEGORY_ID } from '../data/categories';

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  aliases: string[];
}

export const CATALOG: CatalogProduct[] = rawCatalog as CatalogProduct[];

/** Normalize text for comparison: lowercase, strip punctuation, collapse space. */
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Naive singularize so "bananas" matches "banana" and vice-versa. */
const singularize = (w: string): string => {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
};

/** Every searchable phrase (name + aliases) mapped back to its product. */
interface IndexEntry {
  phrase: string; // normalized
  product: CatalogProduct;
}

const INDEX: IndexEntry[] = (() => {
  const entries: IndexEntry[] = [];
  for (const product of CATALOG) {
    const phrases = new Set<string>([product.name, ...product.aliases]);
    for (const p of phrases) {
      const n = normalize(p);
      if (n) entries.push({ phrase: n, product });
    }
  }
  return entries;
})();

/** Exact-id lookup. */
const BY_ID: Record<string, CatalogProduct> = Object.fromEntries(
  CATALOG.map((p) => [p.id, p]),
);

export const getProduct = (id: string): CatalogProduct | undefined => BY_ID[id];

export interface CatalogMatch {
  product: CatalogProduct;
  /** 0..1, higher is a closer match. */
  score: number;
}

/**
 * Rank catalog products against a free-text query. Returns best matches first.
 * Scoring tiers: exact phrase > phrase startsWith > word-level match >
 * substring containment. Returns an empty array when nothing is relevant.
 */
export function searchCatalog(query: string, limit = 8): CatalogMatch[] {
  const q = normalize(query);
  if (!q) return [];
  const qWords = q.split(' ').map(singularize);

  const best = new Map<string, number>(); // productId -> score

  for (const { phrase, product } of INDEX) {
    const pWords = phrase.split(' ').map(singularize);
    let score = 0;

    if (phrase === q) {
      score = 1;
    } else if (phrase.startsWith(q) || q.startsWith(phrase)) {
      score = 0.9;
    } else if (phrase.includes(q) || q.includes(phrase)) {
      score = 0.7;
    } else {
      // Word-overlap score (handles "organic bananas" -> "banana").
      const overlap = qWords.filter((w) => pWords.includes(w)).length;
      if (overlap > 0) {
        score = 0.45 + 0.1 * overlap;
      }
    }

    if (score > 0) {
      const prev = best.get(product.id) ?? 0;
      if (score > prev) best.set(product.id, score);
    }
  }

  return [...best.entries()]
    .map(([id, score]) => ({ product: BY_ID[id], score }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);
}

/**
 * Best single match for a query, or null when no candidate clears the bar.
 * Used by categorization to decide matched-vs-"Other".
 */
export function bestMatch(query: string, threshold = 0.6): CatalogMatch | null {
  const [top] = searchCatalog(query, 1);
  return top && top.score >= threshold ? top : null;
}

export { OTHER_CATEGORY_ID };
