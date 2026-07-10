/* ============================================================================
   CoShop — Item Resolver
   ----------------------------------------------------------------------------
   Turns arbitrary free text (typed, and later spoken or OCR'd) into a
   normalized list item: a clean display name, an optional catalog id when it
   matches a known product, and a category. Unmatched text resolves to the
   `other` category so a capture is never blocked.

   Pure TS — shared by the add flow today and the voice/OCR flows in Phase 2.
   ========================================================================== */

import { bestMatch, getProduct, OTHER_CATEGORY_ID } from './catalog';

export interface ResolvedItem {
  /** Display name (catalog name when matched, else the cleaned input). */
  name: string;
  /** Set when the input matched a catalog product. */
  catalogId?: string;
  /** Category id; `other` when unmatched. */
  category: string;
  /** Whether this came from a confident catalog match. */
  matched: boolean;
}

/** Title-case a free-text fallback name so "cold brew" -> "Cold Brew". */
const prettify = (s: string): string =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Resolve free text to a catalog-aware item. Always returns something
 * addable — unknown text becomes an `other` item carrying the original name.
 */
export function resolveItem(text: string): ResolvedItem {
  const raw = text.trim();
  if (!raw) {
    return { name: '', category: OTHER_CATEGORY_ID, matched: false };
  }

  const match = bestMatch(raw);
  if (match) {
    return {
      name: match.product.name,
      catalogId: match.product.id,
      category: match.product.category,
      matched: true,
    };
  }

  return { name: prettify(raw), category: OTHER_CATEGORY_ID, matched: false };
}

/** Category for a known catalog id (used when re-deriving on migration). */
export function categoryForCatalogId(catalogId: string | undefined): string {
  if (!catalogId) return OTHER_CATEGORY_ID;
  return getProduct(catalogId)?.category ?? OTHER_CATEGORY_ID;
}
