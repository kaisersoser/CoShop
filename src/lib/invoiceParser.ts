import type { ImportedProduct, ParsedInvoice } from './importTypes';

const DEPARTMENTS = new Map<string, ImportedProduct['category']>([
  ['BOISSONS', 'beverages'], ['BOUCHERIE VOLAILLE', 'meat-seafood'], ['DROGUERIE', 'household'],
  ['EPICERIE', 'pantry'], ['FRUITS ET LEGUMES', 'produce-veg'], ['P.L.S.', 'other'],
  ['PARFUMERIE HYGIENE', 'personal-care'], ['POISSONNERIE', 'meat-seafood'],
]);
const PRODUCT_ROW = /^(\d{13})\s+(.+?)\s+(\d+)\s+(\d+[.,]\d{2})\s+(\d+[.,]\d{2})\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d{2})\s+(\d+)$/;
const normalizeLine = (line: string) => line.replace(/\s+/g, ' ').trim();
const number = (value: string) => Number(value.replace(',', '.'));

const categoryFromSource = (name: string, department: string): ImportedProduct['category'] => {
  const normalized = name.toLocaleLowerCase('fr');
  if (/banane|avocat|pomme(?!s de terre)|orange|citron|poire|fraise|raisin|cerise/.test(normalized)) return 'produce-fruit';
  if (/œuf|oeuf|lait|beurre|margarine|fromage|roquefort|yaourt/.test(normalized)) return 'dairy-eggs';
  if (/pain|croissant|brioche|pâte à pizza/.test(normalized)) return 'bakery';
  if (/poulet|bœuf|boeuf|chipolata|saumon|poisson|viande/.test(normalized)) return 'meat-seafood';
  return DEPARTMENTS.get(department) ?? 'other';
};

export function parseCarrefourInvoiceText(text: string, pageCount = 1): ParsedInvoice {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const products: ImportedProduct[] = [];
  let department = '';
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (DEPARTMENTS.has(line)) { department = line; continue; }
    if (!/^\d{13}\s/.test(line)) continue;
    let candidate = line;
    let match = candidate.match(PRODUCT_ROW);
    while (!match && index + 1 < lines.length && !/^\d{13}\s/.test(lines[index + 1]) && !DEPARTMENTS.has(lines[index + 1]) && candidate.length < 500) {
      candidate = `${candidate} ${lines[++index]}`;
      match = candidate.match(PRODUCT_ROW);
    }
    if (!match) continue;
    const [, ean13, originalName, , , unitPrice, , , deliveredQuantity] = match;
    products.push({ id: `${ean13}-${products.length}`, originalName, name: originalName, ean13, department,
      category: categoryFromSource(originalName, department), confidence: 'source',
      quantity: Math.max(1, Number(deliveredQuantity)), unitPrice: number(unitPrice), selected: true });
  }
  if (!products.length) throw new Error('No supported product lines were found in this PDF.');
  const dateMatch = text.match(/Date de (?:facturation|livraison)\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i)
    ?? text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+Date de (?:facturation|livraison)/i);
  const invoiceDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : undefined;
  const unitsMatch = text.match(/(\d+)\s+articles réceptionnés/i);
  return { retailer: 'Carrefour', currency: 'EUR', invoiceDate, pageCount,
    declaredUnits: unitsMatch ? Number(unitsMatch[1]) : undefined,
    suggestedListName: invoiceDate ? `Carrefour · ${invoiceDate}` : 'Carrefour import', products };
}
