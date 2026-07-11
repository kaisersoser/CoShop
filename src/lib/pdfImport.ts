import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { IMPORT_CATEGORY_IDS, type EnrichedProduct, type ImportedProduct, type ImportLanguage, type ParsedInvoice } from './importTypes';
import { parseCarrefourInvoiceText } from './invoiceParser';

GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 20;
const normalizeLine = (line: string) => line.replace(/\s+/g, ' ').trim();
const DEPARTMENT_NAMES = ['BOISSONS', 'BOUCHERIE VOLAILLE', 'DROGUERIE', 'EPICERIE', 'FRUITS ET LEGUMES', 'P.L.S.', 'PARFUMERIE HYGIENE', 'POISSONNERIE'];

const linesFromPage = (items: TextItem[]): string[] => {
  const rows = new Map<number, Array<{ x: number; text: string }>>();
  for (const item of items) {
    const text = normalizeLine(item.str);
    if (!text) continue;
    const y = Math.round(item.transform[5] * 2) / 2;
    const row = rows.get(y) ?? [];
    row.push({ x: item.transform[4], text }); rows.set(y, row);
  }
  return [...rows.entries()].sort(([a], [b]) => b - a).map(([, row]) => row.sort((a, b) => a.x - b.x).map((part) => part.text).join(' '));
};

/* Carrefour's generated PDF positions wrapped names above/below the numeric row and
   stores columns out of reading order. Reconstruct a canonical row from coordinates. */
const carrefourProductLines = (items: TextItem[]): string[] => {
  const departments = items.filter((item) => DEPARTMENT_NAMES.includes(normalizeLine(item.str)))
    .map((item) => ({ name: normalizeLine(item.str), y: item.transform[5] }));
  const valueNear = (row: TextItem[], minX: number, maxX: number) => normalizeLine(row.find((item) => item.transform[4] >= minX && item.transform[4] < maxX && normalizeLine(item.str))?.str ?? '');
  const output: string[] = [];
  for (const anchor of items.filter((item) => /^\d{13}$/.test(normalizeLine(item.str)))) {
    const y = anchor.transform[5];
    const nearby = items.filter((item) => Math.abs(item.transform[5] - y) <= 6);
    const name = nearby.filter((item) => item.transform[4] >= 90 && item.transform[4] < 310 && normalizeLine(item.str))
      .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]).map((item) => normalizeLine(item.str)).join(' ');
    const delivered = valueNear(nearby, 300, 340);
    const ordered = valueNear(nearby, 340, 370);
    const vat = valueNear(nearby, 370, 405);
    const unitHt = valueNear(nearby, 405, 445);
    const unitTtc = valueNear(nearby, 445, 510);
    const totalTtc = valueNear(nearby, 520, 575);
    if (!name || !/^\d+$/.test(delivered) || !/^\d+$/.test(ordered) || !unitTtc || !totalTtc) continue;
    const department = departments.filter((entry) => entry.y > y).sort((a, b) => a.y - b.y)[0]?.name ?? '';
    if (department) output.push(department);
    output.push(`${normalizeLine(anchor.str)} ${name} ${ordered} ${totalTtc} ${unitTtc} ${vat} ${unitHt} ${delivered}`);
  }
  return output;
};

export async function parseInvoicePdf(file: File, onProgress?: (page: number, total: number) => void): Promise<ParsedInvoice> {
  if (file.type !== 'application/pdf' && !file.name.toLocaleLowerCase().endsWith('.pdf')) throw new Error('Choose a PDF file.');
  if (file.size > MAX_PDF_BYTES) throw new Error('This PDF is larger than 10 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes });
  const document = await loadingTask.promise;
  try {
    if (document.numPages > MAX_PAGES) throw new Error('This PDF has more than 20 pages.');
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const textItems = content.items.filter((item): item is TextItem => 'str' in item);
      pages.push([...linesFromPage(textItems), ...carrefourProductLines(textItems)].join('\n'));
      onProgress?.(pageNumber, document.numPages);
      page.cleanup();
    }
    return parseCarrefourInvoiceText(pages.join('\n'), document.numPages);
  } finally { await loadingTask.destroy(); }
}

export async function enrichProducts(products: ImportedProduct[], targetLanguage: ImportLanguage, accessToken: string): Promise<EnrichedProduct[]> {
  const response = await fetch('/api/enrich-import', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ targetLanguage, items: products.map(({ id, originalName, ean13, department }) => ({ id, originalName, ean13, department })) }),
  });
  const payload = await response.json().catch(() => ({})) as { items?: EnrichedProduct[]; error?: string };
  if (!response.ok) throw new Error(payload.error || 'AI enrichment is unavailable.');
  if (!Array.isArray(payload.items)) throw new Error('AI enrichment returned an invalid response.');
  const expectedIds = new Set(products.map((item) => item.id));
  const seen = new Set<string>();
  return payload.items.filter((item) => {
    const valid = expectedIds.has(item.id) && !seen.has(item.id) && IMPORT_CATEGORY_IDS.includes(item.category) && ['high', 'medium', 'low'].includes(item.confidence);
    if (valid) seen.add(item.id); return valid;
  });
}
