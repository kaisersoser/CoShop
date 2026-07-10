/* ============================================================================
   CoShop — Category Taxonomy
   ----------------------------------------------------------------------------
   The fixed set of product groups items are bucketed into. Order here is the
   display order in the list (the catch-all `other` is forced last regardless).
   `icon` names map to lucide-react icons (resolved in the UI layer).
   ========================================================================== */

export interface Category {
  /** Stable id stored on items; never shown to the user. */
  id: string;
  /** Human label shown as the group heading. */
  label: string;
  /** lucide-react icon name used for the group header. */
  icon: string;
}

/** The ordered taxonomy. Add groups here; keep ids stable once shipped. */
export const CATEGORIES: Category[] = [
  { id: 'produce-fruit', label: 'Fruits', icon: 'Apple' },
  { id: 'produce-veg', label: 'Vegetables', icon: 'Carrot' },
  { id: 'dairy-eggs', label: 'Dairy & Eggs', icon: 'Milk' },
  { id: 'meat-seafood', label: 'Meat & Seafood', icon: 'Fish' },
  { id: 'bakery', label: 'Bakery', icon: 'Croissant' },
  { id: 'pantry', label: 'Pantry', icon: 'Wheat' },
  { id: 'frozen', label: 'Frozen', icon: 'Snowflake' },
  { id: 'beverages', label: 'Beverages', icon: 'CupSoda' },
  { id: 'snacks', label: 'Snacks', icon: 'Cookie' },
  { id: 'breakfast', label: 'Breakfast', icon: 'EggFried' },
  { id: 'household', label: 'Household', icon: 'SprayCan' },
  { id: 'personal-care', label: 'Personal Care', icon: 'HeartPulse' },
  { id: 'baby', label: 'Baby', icon: 'Baby' },
  { id: 'pet', label: 'Pet', icon: 'PawPrint' },
  { id: 'other', label: 'Other', icon: 'Package' },
];

/** The catch-all category id used for unmatched / uncategorized items. */
export const OTHER_CATEGORY_ID = 'other';

const BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

/** Look up a category by id, falling back to `other` for unknown ids. */
export const getCategory = (id: string): Category =>
  BY_ID[id] ?? BY_ID[OTHER_CATEGORY_ID];

/** Display order index; `other` always sorts last. */
export const categoryOrder = (id: string): number => {
  if (id === OTHER_CATEGORY_ID) return Number.MAX_SAFE_INTEGER;
  const idx = CATEGORIES.findIndex((c) => c.id === id);
  return idx === -1 ? Number.MAX_SAFE_INTEGER - 1 : idx;
};
