import { ShoppingList } from 'coshop';

// Shows the list with real items grouped by store (Pending + Purchased sections).
// Store auto-seeds on first load: Whole Foods, Trader Joe's, Farmers Market pending items
// plus one purchased Cold Brew item. No setup needed — the Zustand store initialises itself.
export function WithItems() {
  return <ShoppingList />;
}
