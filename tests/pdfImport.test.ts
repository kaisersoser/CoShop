import { describe, expect, it } from 'vitest';
import { parseCarrefourInvoiceText } from '../src/lib/invoiceParser';

const SAMPLE = `
Date de facturation : 20/06/2026
5 articles réceptionnés conformément à votre commande
BOISSONS
3560070215713 Jus Multifruits Pur Jus CARREFOUR EXTRA 2 6.10 3.05 5.5 2.89 2
FRUITS ET LEGUMES
3276558440996 Bananes SIMPL 2 1.98 0.99 5.5 0.94 2
P.L.S.
3560071098292 Œufs Frais de Poules Elevées au Sol CARREFOUR
CLASSIC' 1 4.79 4.79 5.5 4.54 1
`;

describe('PDF invoice import', () => {
  it('extracts deterministic product facts without AI', () => {
    const invoice = parseCarrefourInvoiceText(SAMPLE, 2);
    expect(invoice).toMatchObject({ retailer: 'Carrefour', currency: 'EUR', invoiceDate: '2026-06-20', pageCount: 2, declaredUnits: 5 });
    expect(invoice.products).toHaveLength(3);
    expect(invoice.products[0]).toMatchObject({ ean13: '3560070215713', quantity: 2, unitPrice: 3.05, category: 'beverages' });
    expect(invoice.products[1]).toMatchObject({ name: 'Bananes SIMPL', category: 'produce-fruit' });
    expect(invoice.products[2]).toMatchObject({ name: "Œufs Frais de Poules Elevées au Sol CARREFOUR CLASSIC'", category: 'dairy-eggs' });
  });

  it('rejects documents without supported product rows', () => {
    expect(() => parseCarrefourInvoiceText('Not an invoice')).toThrow('No supported product lines');
  });
});
