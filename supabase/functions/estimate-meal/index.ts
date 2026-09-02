/**
 * estimate-meal — a meal in, food items with macros out.
 *
 * TWO INPUT MODES, one brain:
 *   photos   multipart with image files (two-shot protocol, optional label)
 *   text     multipart with an `items` JSON array — [{description, qty, grams}]
 *
 * Fibre is reported alongside carbs so the app can show net carbs. It is a
 * SUBSET of carbs_g, never an addition, and that is enforced here rather than
 * trusted — the writer is an LLM.
 *
 * Spec: one brain, two front doors. The app calls this today and the MCP
 * connector will call it later, so both resolve through the same prompt and
 * the same validation. Estimation never runs on device: the API cost lands on
 * the coach's account and has to be bounded per client.
 *
 * SHADOW MODE. Every run records the metrics an escalation decision would use
 * and whether it *would* have escalated. Nothing escalates.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = Deno.env.get('ESTIMATE_MODEL') ?? 'claude-sonnet-4-5';
const MAX_PHOTOS = 3;
const MAX_TEXT_ITEMS = 20;

// shadow thresholds — deliberately provisional
const RECONCILE_LIMIT = 0.15;
const SPREAD_LIMIT = 1.5;
const COMPLEX_ITEMS = 4;
const CONFIDENCE_FLOOR = 0.6;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

type Item = {
  description: string;
  qty?: string;
  grams?: number;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  kcal_low?: number;
  kcal_high?: number;
};

type TextItem = { description: string; qty?: string; grams?: number };

const SHARED_RULES = `Return one entry per distinct food, not one per meal. "Chicken, rice, broccoli" is three entries.

For each food give:
- description: what it is, plainly.
- qty: the portion in the units a person would say ("about 200g", "1 cup", "2 slices").
- grams: that item's weight in grams.
- kcal, protein_g, carbs_g, fat_g: your best point estimate for that portion.
- fiber_g: grams of dietary fibre INSIDE carbs_g, never on top of it. Net carbs are carbs minus fibre, so fibre must never exceed carbs. Meat, eggs, dairy, oil and butter are 0. Give a real figure for vegetables, fruit, beans, whole grains and nuts rather than omitting it.
- kcal_low, kcal_high: the plausible range if you are unsure of the amount.

Account for cooking fat. Oil in the pan, butter on the vegetables, dressing on the salad and sauce on the plate all carry calories that are easy to miss. Missing them is the most common way an estimate comes out too low.

Keep macros internally consistent: protein and carbs are about 4 kcal per gram, fat about 9. Your kcal should be close to 4*protein + 4*carbs + 9*fat.

Also return "confidence": 0 to 1 for the meal as a whole. Be honest.

Respond with JSON only, no prose:
{"confidence":0.0,"items":[{"description":"","qty":"","grams":0,"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"kcal_low":0,"kcal_high":0}]}`;

function photoPrompt(totalWeight: number | null): string {
  const weighed = totalWeight
    ? `\n\nMEASURED WEIGHT: the person weighed the food on this plate and it came to ${totalWeight} grams, food only, dish tared out. Treat this as fact, not as a hint. Your per-item gram estimates must sum to approximately ${totalWeight}g. Use it to divide the plate rather than to judge the plate: decide the proportion each food occupies, then apportion the measured weight between them. Where this conflicts with what the portion looks like, the scale wins.`
    : '';

  return `You are estimating the nutrition content of a meal from photographs.

The photos follow a two-shot protocol: one straight down over the plate, one at roughly 45 degrees with a utensil in frame for scale. A third photo may be a nutrition facts label from packaging — if a label is present, its numbers take priority over visual estimation for that food.${weighed}

Use the utensil, plate rim and hand for scale. Estimate cooked weight unless the food is obviously raw. If part of the plate is ambiguous, still give your best numbers — a person reviews and corrects them. Do not refuse.

${SHARED_RULES}`;
}

/**
 * Photo mode, but pinned to the rows the person actually logged.
 *
 * The failure this exists for: someone logs "3 large eggs", "3 chicken sausage",
 * "1 tbsp butter", "1 tbsp cottage cheese", photographs the plate, and the model
 * — reasonably — describes what it sees as an omelette, folding the eggs and the
 * butter into one item. Four rows in, three foods out, no way to map them, and
 * the whole meal stays blank.
 *
 * The list is not a hint here, it is the output shape. The photo is for amounts;
 * their words are for what the food is.
 */
function alignedPhotoPrompt(items: TextItem[], totalWeight: number | null): string {
  const lines = items
    .map((i, n) => {
      const bits = [i.description];
      if (i.grams) bits.push(`${i.grams} g (weighed)`);
      else if (i.qty) bits.push(i.qty);
      return `${n + 1}. ${bits.join(' — ')}`;
    })
    .join('\n');

  const weighed = totalWeight
    ? `\n\nMEASURED WEIGHT: the food on this plate weighed ${totalWeight} grams, dish tared out. Treat this as fact. Your per-item grams must sum to approximately ${totalWeight}g — use it to divide the plate between the listed foods, not to judge the plate.`
    : '';

  return `You are estimating the nutrition content of a meal from photographs, for a person who has ALSO written down what they ate.

The photos follow a two-shot protocol: one straight down over the plate, one at roughly 45 degrees with a utensil in frame for scale. A third photo may be a nutrition facts label — if a label is present, its numbers take priority over visual estimation for that food.${weighed}

ALIGNED MODE — this is the important part.

They logged these foods, in this order:
${lines}

Return EXACTLY ${items.length} items, in exactly that order, one for each numbered line. Do not merge two of their lines into one item. Do not split one line into two. Do not add a food they did not list, and do not drop one.

This matters more than describing the photo neatly. If the photo shows an omelette and they logged "eggs" and "butter" as separate lines, that is two items — apportion the omelette between them. If a line names something you cannot see, still return an item for it and estimate from the words alone, noting the assumption in that item's description.

Use the PHOTO for amounts and the LIST for what the food is. The photo tells you how much is on the plate; their list tells you what the plate is made of.

Use the utensil, plate rim and hand for scale. Estimate cooked weight unless the food is obviously raw. Do not refuse.

${SHARED_RULES}`;
}

function textPrompt(items: TextItem[], totalWeight: number | null): string {
  const lines = items
    .map((i) => {
      const bits = [i.description];
      if (i.grams) bits.push(`${i.grams} g (weighed)`);
      else if (i.qty) bits.push(i.qty);
      return `- ${bits.join(' — ')}`;
    })
    .join('\n');

  const total = totalWeight
    ? `\n\nThe whole plate was weighed at ${totalWeight} grams, food only, dish tared out. Your per-item grams must sum to approximately that. The scale wins over any assumption about typical portion size.`
    : '';

  return `You are estimating the nutrition content of a meal a person has described in writing. There is no photograph.

WHAT THEY LOGGED:
${lines}${total}

Where a weight in grams is given, treat it as measured fact — do not second-guess it, and do not substitute a "typical serving". Your job for that item is to identify the food and give macros for exactly that weight.

Where no weight is given, estimate the portion a person would most likely mean by that description, and widen kcal_low and kcal_high to reflect that you are guessing the amount.

Assume cooked weight for meats and grains unless the description says raw. Where a description is non-specific ("pork", "cheese", "bread"), assume the most commonly eaten form of that food and say which one you assumed in the description you return — for example "Pork loin chop, cooked" rather than just "pork". Do not refuse for lack of detail; a person reviews and corrects these numbers.

${SHARED_RULES}`;
}

function sanitise(raw: unknown): { items: Item[]; confidence: number | null } {
  const o = raw as { items?: unknown[]; confidence?: unknown };
  const conf = typeof o?.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : null;
  if (!Array.isArray(o?.items)) return { items: [], confidence: conf };

  const clamp = (v: unknown, max: number): number | undefined => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
    return Math.round(n * 10) / 10;
  };

  const items = o.items
    .slice(0, 20)
    .map((it) => {
      const r = it as Record<string, unknown>;
      const description = String(r.description ?? '').trim().slice(0, 200);
      if (!description) return null;

      const carbs = clamp(r.carbs_g, 1000);
      let fiber = clamp(r.fiber_g, 500);
      // fibre lives inside carbs. more fibre than carbs is the model
      // contradicting itself, and fibre with no carbs at all is meaningless.
      if (fiber != null && carbs == null) fiber = undefined;
      else if (fiber != null && carbs != null && fiber > carbs) fiber = carbs;

      return {
        description,
        qty: r.qty ? String(r.qty).trim().slice(0, 60) : undefined,
        grams: clamp(r.grams, 5000),
        kcal: clamp(r.kcal, 6000),
        protein_g: clamp(r.protein_g, 1000),
        carbs_g: carbs,
        fat_g: clamp(r.fat_g, 1000),
        fiber_g: fiber,
        kcal_low: clamp(r.kcal_low, 6000),
        kcal_high: clamp(r.kcal_high, 6000),
      } as Item;
    })
    .filter((x): x is Item => x !== null);

  return { items, confidence: conf };
}

function shadow(
  items: Item[],
  confidence: number | null,
  hadLabel: boolean,
  weighed: boolean,
  mode: 'photo' | 'text'
) {
  const sum = (f: (i: Item) => number | undefined) => items.reduce((a, i) => a + (f(i) ?? 0), 0);

  const kcal = sum((i) => i.kcal);
  const p = sum((i) => i.protein_g);
  const c = sum((i) => i.carbs_g);
  const f = sum((i) => i.fat_g);

  const implied = p * 4 + c * 4 + f * 9;
  const reconcile = kcal > 0 ? Math.abs(kcal - implied) / kcal : null;

  const low = sum((i) => i.kcal_low);
  const high = sum((i) => i.kcal_high);
  const spread = low > 0 && high > 0 ? high / low : null;

  const reasons: string[] = [];
  if (reconcile != null && reconcile > RECONCILE_LIMIT) reasons.push('macros_do_not_reconcile');
  // a measured weight removes the portion guess, so a wide range no longer
  // means the model was lost
  if (!weighed && spread != null && spread > SPREAD_LIMIT) reasons.push('wide_portion_range');
  if (mode === 'photo' && !weighed && items.length > COMPLEX_ITEMS && !hadLabel) {
    reasons.push('complex_plate_no_label');
  }
  // a bare description with no weight is the thinnest input this accepts
  if (mode === 'text' && !weighed) reasons.push('text_only_no_weight');
  if (confidence != null && confidence < CONFIDENCE_FLOOR) reasons.push('low_self_confidence');

  return {
    kcal, p, c, f,
    reconcile_delta_pct: reconcile,
    spread_ratio: spread,
    reasons,
    would_escalate: reasons.length > 0,
  };
}

async function toBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

function parseTextItems(raw: string | null): TextItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .slice(0, MAX_TEXT_ITEMS)
    .map((it) => {
      const r = it as Record<string, unknown>;
      const description = String(r.description ?? '').trim().slice(0, 200);
      if (!description) return null;
      const g = Number(r.grams);
      return {
        description,
        qty: r.qty ? String(r.qty).trim().slice(0, 60) : undefined,
        grams: Number.isFinite(g) && g > 0 && g <= 10000 ? Math.round(g) : undefined,
      } as TextItem;
    })
    .filter((x): x is TextItem => x !== null);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ status: 'failed', reason: 'POST only' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json({ status: 'unavailable', reason: 'Estimation isn’t switched on yet (no API key set).' });
  }

  let files: File[] = [];
  let textItems: TextItem[] = [];
  let clientId: string | null = null;
  let tenantId: string | null = null;
  let totalWeight: number | null = null;
  try {
    const form = await req.formData();
    files = [...form.values()].filter((v): v is File => v instanceof File).slice(0, MAX_PHOTOS);
    textItems = parseTextItems(form.get('items') as string | null);
    clientId = (form.get('client_id') as string) ?? null;
    tenantId = (form.get('tenant_id') as string) ?? null;
    const w = Number(form.get('total_weight_g'));
    totalWeight = Number.isFinite(w) && w > 0 && w <= 10000 ? Math.round(w) : null;
  } catch {
    return json({ status: 'failed', reason: 'expected multipart form data' }, 400);
  }

  const mode: 'photo' | 'text' = files.length > 0 ? 'photo' : 'text';
  if (mode === 'text' && textItems.length === 0) {
    return json({ status: 'failed', reason: 'nothing to estimate — add a photo or name the food' }, 400);
  }

  const hadLabel = files.some((f) => f.name.includes('label'));
  // a per-item weight anchors the estimate just as a plate weight does
  const anyWeight = totalWeight != null || textItems.some((i) => i.grams != null);

  // photos plus a written list means we can demand one output row per logged row
  const aligned = mode === 'photo' && textItems.length > 0;

  const content: unknown[] = [];
  if (mode === 'photo') {
    for (const f of files) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: f.type || 'image/jpeg', data: await toBase64(f) },
      });
    }
    // when we know what they logged, the row list is the output shape
    content.push({
      type: 'text',
      text: aligned ? alignedPhotoPrompt(textItems, totalWeight) : photoPrompt(totalWeight),
    });
  } else {
    content.push({ type: 'text', text: textPrompt(textItems, totalWeight) });
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content }] }),
    });
  } catch (e) {
    return json({ status: 'failed', reason: `could not reach the model: ${e}` }, 502);
  }

  if (!res.ok) {
    const body = await res.text();
    return json({ status: 'failed', reason: `model error ${res.status}: ${body.slice(0, 300)}` }, 502);
  }

  const payload = await res.json();
  const latency = Date.now() - started;
  const text: string = payload?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return json({ status: 'failed', reason: 'model did not return JSON' }, 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return json({ status: 'failed', reason: 'model returned malformed JSON' }, 502);
  }

  const { items, confidence } = sanitise(parsed);
  if (items.length === 0) {
    return json({
      status: 'failed',
      reason: mode === 'photo' ? 'nothing recognised in the photo' : 'could not identify that food',
    });
  }

  const s = shadow(items, confidence, hadLabel, anyWeight, mode);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      await fetch(`${url}/rest/v1/estimate_runs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: key,
          authorization: `Bearer ${key}`,
          prefer: 'return=minimal',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          client_id: clientId,
          model: MODEL,
          photo_count: files.length,
          had_label: hadLabel,
          total_weight_g: totalWeight,
          latency_ms: latency,
          item_count: items.length,
          kcal_total: s.kcal,
          protein_g_total: s.p,
          carbs_g_total: s.c,
          fat_g_total: s.f,
          reconcile_delta_pct: s.reconcile_delta_pct,
          spread_ratio: s.spread_ratio,
          self_confidence: confidence,
          would_escalate: s.would_escalate,
          escalation_reasons: s.reasons,
          raw: { mode, aligned, input: textItems.length > 0 ? textItems : null, items, usage: payload?.usage ?? null },
        }),
      });
    }
  } catch (_) {
    // instrumentation must never cost the client their estimate
  }

  return json({
    status: 'ok',
    mode,
    // true only when the caller supplied the logged rows AND the model honoured
    // the count — the caller can then map item[i] onto row[i] without guessing
    aligned: aligned && items.length === textItems.length,
    requested: aligned ? textItems.length : null,
    items,
    confidence,
    shadow: { would_escalate: s.would_escalate, reasons: s.reasons },
  });
});
