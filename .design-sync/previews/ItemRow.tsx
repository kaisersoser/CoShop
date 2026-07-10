import { ItemRow } from 'coshop';

const baseItem = {
  id: 'preview-1',
  name: 'Organic Avocados',
  category: 'produce-fruit',
  price: 0.99,
  quantity: 4,
  isPurchased: false,
  createdAt: 1719600000000,
};

// Pending item: unchecked checkbox, name in full, price × qty and line total.
export function Pending() {
  return (
    <ul style={{ listStyle: 'none', padding: 0, background: 'var(--bg-elev-2)', borderRadius: 'var(--r-lg)' }}>
      <ItemRow item={{ ...baseItem, isPurchased: false }} />
    </ul>
  );
}

// Purchased item: green gradient checkbox, strikethrough name, muted opacity.
export function Purchased() {
  return (
    <ul style={{ listStyle: 'none', padding: 0, background: 'var(--bg-elev-2)', borderRadius: 'var(--r-lg)' }}>
      <ItemRow item={{ ...baseItem, id: 'preview-2', name: 'Cold Brew Concentrate', category: 'beverages', price: 11.99, quantity: 1, isPurchased: true }} />
    </ul>
  );
}

// Mixed group — priced, price-less, and an "Other" item with its inline picker.
export function MixedGroup() {
  return (
    <ul style={{ listStyle: 'none', padding: '0 8px', background: 'var(--bg-elev-2)', borderRadius: 'var(--r-lg)' }}>
      <ItemRow item={{ ...baseItem, isPurchased: false }} />
      <ItemRow item={{ ...baseItem, id: 'preview-3', name: 'Sourdough Loaf', category: 'bakery', price: 6.5, quantity: 1, isPurchased: false }} />
      <ItemRow item={{ ...baseItem, id: 'preview-4', name: 'Birthday Candles', category: 'other', price: undefined, quantity: 1, isPurchased: false }} />
      <ItemRow item={{ ...baseItem, id: 'preview-2', name: 'Cold Brew Concentrate', category: 'beverages', price: 11.99, quantity: 1, isPurchased: true }} />
    </ul>
  );
}
