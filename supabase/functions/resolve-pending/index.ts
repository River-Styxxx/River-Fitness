/**
 * resolve-pending — the safety net under estimation.
 *
 * `pending` had nothing watching it. An entry logged without numbers depended
 * entirely on the app firing an estimate at that moment and that estimate
 * coming back cleanly. Every way that can fail — request dies, phone loses
 * signal, app is closed mid-flight, or the model merges two logged foods into
 * one and the row mapping becomes unguessable — left the row blank forever,
 * discoverable only by a person opening that day and noticing. One row in this
 * database sat blank from 19 August because of it.
 *
 * This runs server-side on a schedule, so resolution never depends on the
 * client coming back. They log; it fills in; they see numbers next time they
 * look.
 *
 * Three passes, cheapest first, and it stops as soon as a row has its numbers:
 *   1. ALIGNED  — the meal's photos plus every logged row, one call, the model
 *                 required to return one item per row in order.
 *   2. PER-ROW  — a call per still-blank row, its own photos and weight. No
 *                 mapping to get wrong because there is only one row.
 *   3. GIVE UP  — after 3 attempts the row is flagged to the coach's triage
 *                 with the reason. Never silently retried forever, never
 *                 silently abandoned.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const MIN_AGE_MINUTES = 15;   // let the app's own attempt land first
const MAX_ATTEMPTS = 3;
const MAX_MEALS_PER_RUN = 25; // bounded so one bad night cannot run up a bill

type Entry = {
  id: string;
  client_id: string;
  tenant_id: string;
  meal_id: string | null;
  description: string;
  qty: string | null;
  weight_g: number | null;
  estimate_attempts: number;
};

type Estimated = {
  description?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
};

Deno.serve(async (req) => {
  const expected = Deno.env.get('PURGE_TOKEN');
  if (!expected) return json({ error: 'PURGE_TOKEN not set; refusing to run' }, 503);
  if (req.headers.get('x-purge-token') !== expected) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - MIN_AGE_MINUTES * 60_000).toISOString();
  const { data: rows, error } = await db
    .from('food_log_entries')
    .select('id, client_id, tenant_id, meal_id, description, qty, weight_g, estimate_attempts')
    .is('kcal', null)
    .is('deleted_at', null)
    .lt('estimate_attempts', MAX_ATTEMPTS)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return json({ error: error.message }, 500);

  const pending = (rows ?? []) as Entry[];
  if (pending.length === 0) return json({ scanned: 0, resolved: 0, flagged: 0, note: 'nothing pending' });

  // group by meal; rows with no meal_id stand alone under their own id
  const groups = new Map<string, Entry[]>();
  for (const r of pending) {
    const k = r.meal_id ?? `solo:${r.id}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  let resolved = 0;
  let flagged = 0;
  const detail: unknown[] = [];

  for (const [groupKey, entries] of [...groups].slice(0, MAX_MEALS_PER_RUN)) {
    const mealId = groupKey.startsWith('solo:') ? null : groupKey;
    const client = entries[0].client_id;
    const tenant = entries[0].tenant_id;
    let outstanding = entries;

    // ---- pass 1: aligned, the whole meal at once -------------------------
    if (outstanding.length > 1) {
      const photos = await photosFor(db, client, mealId, outstanding.map((e) => e.id));
      const out = await estimate(db, photos, client, tenant, outstanding.map(described));
      if (out?.aligned && out.items.length === outstanding.length) {
        for (let i = 0; i < outstanding.length; i++) {
          if (await write(db, outstanding[i], out.items[i])) resolved++;
        }
        outstanding = [];
      }
    }

    // ---- pass 2: one row at a time ---------------------------------------
    for (const e of outstanding) {
      const photos = await photosFor(db, client, mealId, [e.id]);
      const out = await estimate(db, photos, client, tenant, [described(e)]);
      // one row in means every food it found belongs to that row; sum them
      if (out && out.items.length > 0) {
        const merged = out.items.length === 1 ? out.items[0] : sum(out.items);
        if (await write(db, e, merged)) {
          resolved++;
          continue;
        }
      }
      const attempts = e.estimate_attempts + 1;
      await db
        .from('food_log_entries')
        .update({
          estimate_attempts: attempts,
          estimate_last_at: new Date().toISOString(),
          estimate_note:
            out == null
              ? 'estimator unreachable or returned nothing'
              : 'model returned no usable numbers for this row',
        })
        .eq('id', e.id);
      if (attempts >= MAX_ATTEMPTS) {
        flagged++;
        detail.push({ id: e.id, description: e.description, gaveUpAfter: attempts });
      }
    }
  }

  return json({ scanned: pending.length, meals: groups.size, resolved, flagged, gaveUp: detail });

  // -------------------------------------------------------------------------

  function described(e: Entry) {
    return {
      description: e.description,
      qty: e.qty ?? undefined,
      grams: e.weight_g != null ? Number(e.weight_g) : undefined,
    };
  }

  /** the photos belonging to this meal, plus any hanging off these rows */
  async function photosFor(
    db: ReturnType<typeof createClient>,
    clientId: string,
    mealId: string | null,
    entryIds: string[],
  ): Promise<{ name: string; blob: Blob }[]> {
    const wanted: string[] = [];
    const { data } = await db
      .from('attachments')
      .select('storage_path, entity_type, entity_id')
      .is('deleted_at', null)
      .or(
        [
          mealId ? `and(entity_type.eq.meal,entity_id.eq.${mealId})` : null,
          `and(entity_type.eq.food_log_entry,entity_id.in.(${entryIds.join(',')}))`,
        ]
          .filter(Boolean)
          .join(','),
      );
    for (const a of data ?? []) {
      const p = (a as { storage_path: string }).storage_path;
      if (p && !p.endsWith('.thumb.jpg')) wanted.push(p);
    }

    const out: { name: string; blob: Blob }[] = [];
    for (const path of wanted.slice(0, 3)) {
      const { data: file } = await db.storage.from('meal-photos').download(path);
      // the filename carries the shot kind; estimate-meal reads it off the name
      if (file) out.push({ name: path.split('/').pop() ?? 'shot.jpg', blob: file });
    }
    return out;
  }

  async function estimate(
    db: ReturnType<typeof createClient>,
    photos: { name: string; blob: Blob }[],
    clientId: string,
    tenantId: string,
    items: { description: string; qty?: string; grams?: number }[],
  ): Promise<{ aligned: boolean; items: Estimated[] } | null> {
    const form = new FormData();
    photos.forEach((p, i) => form.append(`shot_${i}`, p.blob, `shot_${i}_${p.name}`));
    form.append('client_id', clientId);
    form.append('tenant_id', tenantId);
    form.append('items', JSON.stringify(items));
    try {
      const { data, error } = await db.functions.invoke('estimate-meal', { body: form });
      if (error || !data || data.status !== 'ok') return null;
      return { aligned: !!data.aligned, items: (data.items ?? []) as Estimated[] };
    } catch {
      return null;
    }
  }

  /** writes only what came back — a null would blank a field or re-pend the row */
  async function write(
    db: ReturnType<typeof createClient>,
    entry: Entry,
    it: Estimated | undefined,
  ): Promise<boolean> {
    if (!it || it.kcal == null) return false;
    const patch: Record<string, unknown> = {
      kcal: Math.round(it.kcal),
      status: 'estimated',
      estimate_attempts: entry.estimate_attempts + 1,
      estimate_last_at: new Date().toISOString(),
      estimate_note: null,
    };
    if (it.description) patch.description = it.description;
    if (it.protein_g != null) patch.protein_g = Math.round(it.protein_g);
    if (it.carbs_g != null) patch.carbs_g = Math.round(it.carbs_g);
    if (it.fat_g != null) patch.fat_g = Math.round(it.fat_g);
    if (it.fiber_g != null) patch.fiber_g = Math.round(it.fiber_g);
    const { error } = await db.from('food_log_entries').update(patch).eq('id', entry.id);
    return !error;
  }

  function sum(items: Estimated[]): Estimated {
    const t = (k: keyof Estimated) =>
      items.reduce((a, i) => a + (typeof i[k] === 'number' ? (i[k] as number) : 0), 0);
    return {
      kcal: t('kcal'),
      protein_g: t('protein_g'),
      carbs_g: t('carbs_g'),
      fat_g: t('fat_g'),
      fiber_g: items.some((i) => i.fiber_g != null) ? t('fiber_g') : undefined,
    };
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
