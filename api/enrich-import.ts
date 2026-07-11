import { createClient } from '@supabase/supabase-js';
import { IMPORT_CATEGORY_IDS, IMPORT_LANGUAGES, type EnrichedProduct, type ImportLanguage } from '../src/lib/importTypes';

interface VercelRequest { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; }
interface VercelResponse { status: (code: number) => VercelResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void; }

const MAX_ITEMS = 100;
const requests = new Map<string, { count: number; resetAt: number }>();
export const maxDuration = 60;

const json = (response: VercelResponse, status: number, body: unknown) => response.status(status).json(body);
const extractOutputText = (payload: { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) =>
  payload.output?.flatMap((item) => item.content ?? []).find((content) => content.type === 'output_text')?.text;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); return json(response, 405, { error: 'Method not allowed.' }); }
  const apiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !supabaseUrl || !supabaseKey) return json(response, 503, { error: 'AI enrichment is not configured.' });

  const authorization = request.headers.authorization;
  const token = (Array.isArray(authorization) ? authorization[0] : authorization)?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(response, 401, { error: 'Sign in before using AI enrichment.' });
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return json(response, 401, { error: 'Your session could not be verified.' });

  const now = Date.now(); const current = requests.get(data.user.id);
  const rate = !current || current.resetAt <= now ? { count: 0, resetAt: now + 10 * 60_000 } : current;
  if (rate.count >= 5) { response.setHeader('Retry-After', String(Math.ceil((rate.resetAt - now) / 1000))); return json(response, 429, { error: 'AI import limit reached. Try again shortly.' }); }
  rate.count++; requests.set(data.user.id, rate);

  let body: unknown;
  try { body = typeof request.body === 'string' ? JSON.parse(request.body) as unknown : request.body as unknown; }
  catch { return json(response, 400, { error: 'Invalid JSON request.' }); }
  if (!body || typeof body !== 'object') return json(response, 400, { error: 'Invalid import request.' });
  const { items, targetLanguage } = body as { items?: unknown; targetLanguage?: ImportLanguage };
  if (!IMPORT_LANGUAGES.includes(targetLanguage as ImportLanguage) || !Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS) return json(response, 400, { error: 'Invalid import request.' });
  const selectedLanguage = targetLanguage as ImportLanguage;

  const cleanItems = items.map((item) => {
    if (!item || typeof item !== 'object') return null;
    const input = item as Record<string, unknown>;
    if (typeof input.id !== 'string' || typeof input.originalName !== 'string' || typeof input.ean13 !== 'string' || typeof input.department !== 'string') return null;
    if (input.id.length > 80 || input.originalName.length > 240 || !/^\d{13}$/.test(input.ean13) || input.department.length > 80) return null;
    return { id: input.id, originalName: input.originalName, ean13: input.ean13, department: input.department };
  });
  if (cleanItems.some((item) => !item)) return json(response, 400, { error: 'One or more product rows are invalid.' });

  const schema = {
    type: 'object', additionalProperties: false, required: ['items'], properties: {
      items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'category', 'confidence'], properties: {
        id: { type: 'string' }, name: { type: 'string' }, category: { type: 'string', enum: IMPORT_CATEGORY_IDS }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      } } },
    },
  };
  const languageNames: Record<Exclude<ImportLanguage, 'original'>, string> = { en: 'English', fr: 'French', de: 'German', es: 'Spanish' };
  const languageInstruction = selectedLanguage === 'original' ? 'Keep each original product name exactly unchanged.' : `Translate each product name into ${languageNames[selectedLanguage]}. Preserve brands, product variants, quantities, and proper nouns.`;
  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_IMPORT_MODEL || 'gpt-5.6-luna', store: false,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: `You classify grocery products into exactly one supplied CoShop category. ${languageInstruction} Return one result for every input id. Use department only as a hint. Never change or omit ids.` }] },
        { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(cleanItems) }] },
      ],
      text: { format: { type: 'json_schema', name: 'shopping_import_enrichment', strict: true, schema } },
    }),
  });
  const openaiPayload = await openaiResponse.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
  if (!openaiResponse.ok) return json(response, 502, { error: openaiPayload.error?.message || 'AI enrichment failed.' });
  const outputText = extractOutputText(openaiPayload);
  if (!outputText) return json(response, 502, { error: 'AI enrichment returned no results.' });
  const parsed = JSON.parse(outputText) as { items?: EnrichedProduct[] };
  if (!Array.isArray(parsed.items)) return json(response, 502, { error: 'AI enrichment returned invalid results.' });

  const originals = new Map(cleanItems.map((item) => [item!.id, item!])); const seen = new Set<string>();
  const valid = parsed.items.every((item) => {
    const original = originals.get(item.id); if (!original || seen.has(item.id)) return false; seen.add(item.id);
    if (!IMPORT_CATEGORY_IDS.includes(item.category) || !['high', 'medium', 'low'].includes(item.confidence) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 240) return false;
    if (selectedLanguage === 'original') item.name = original.originalName;
    return true;
  });
  if (!valid || seen.size !== cleanItems.length) return json(response, 502, { error: 'AI enrichment did not return every product safely.' });
  response.setHeader('Cache-Control', 'no-store');
  return json(response, 200, { items: parsed.items });
}
