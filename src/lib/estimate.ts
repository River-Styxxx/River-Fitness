/**
 * Photo -> items + macros.
 *
 * One brain, two front doors (spec): this calls the same server function the
 * MCP connector will call, so a photo logged in the app and a photo described
 * to Claude resolve through identical library lookup, prompt and output. The
 * estimate never happens on the device — the API cost lands on the coach's
 * account and has to be rate-limited per client.
 *
 * Two front doors on one brain: photos when they exist, the written description
 * and its weight when they don't. "300 g pork" is a complete question and the
 * old photo-only path left it stuck pending with nothing able to resolve it.
 *
 * Never invents numbers locally — a fabricated macro would be indistinguishable
 * from a real one once it's in the log.
 */
import { supabase } from './supabase';

export type EstimatedItem = {
  description: string;
  qty?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type EstimateOutcome =
  | { status: 'ok'; items: EstimatedItem[] }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; reason: string };

/** what the text path sends: a name is a complete question when it has a weight */
export type TextItemInput = { description: string; qty?: string; grams?: number | null };

export async function estimateFromPhotos(
  photos: { kind: string; blob: Blob }[],
  ctx?: {
    clientId?: string | null;
    tenantId?: string | null;
    totalWeightG?: number | null;
    /** described foods — used alone when there are no photos */
    items?: TextItemInput[];
  }
): Promise<EstimateOutcome> {
  const described = (ctx?.items ?? []).filter((i) => i.description.trim().length > 0);
  if (photos.length === 0 && described.length === 0) {
    return { status: 'failed', reason: 'nothing to estimate' };
  }

  const form = new FormData();
  // the filename carries the shot kind, so the server can tell a nutrition
  // label from a plate without needing a second field
  photos.forEach((p, i) => form.append(`shot_${i}`, p.blob, `shot_${i}_${p.kind}.jpg`));
  if (ctx?.clientId) form.append('client_id', ctx.clientId);
  if (ctx?.tenantId) form.append('tenant_id', ctx.tenantId);
  if (ctx?.totalWeightG && Number.isFinite(ctx.totalWeightG)) {
    form.append('total_weight_g', String(ctx.totalWeightG));
  }
  // the server picks its mode from what arrives: photos win, text is the fallback
  if (described.length > 0) {
    form.append(
      'items',
      JSON.stringify(
        described.map((i) => ({
          description: i.description.trim(),
          qty: i.qty?.trim() || undefined,
          grams: i.grams ?? undefined,
        }))
      )
    );
  }

  try {
    const { data, error } = await supabase.functions.invoke('estimate-meal', { body: form });
    if (error) {
      // no function deployed yet -> 404 from the functions gateway
      const msg = String(error.message ?? error);
      if (/not found|404/i.test(msg)) {
        return { status: 'unavailable', reason: 'Estimation isn’t connected yet.' };
      }
      return { status: 'failed', reason: msg };
    }
    // the function reports its own state in the body, so "not configured yet"
    // stays distinguishable from "broken"
    const body = data as { status?: string; reason?: string; items?: EstimatedItem[] };
    if (body?.status === 'unavailable') {
      return { status: 'unavailable', reason: body.reason ?? 'Estimation isn’t switched on yet.' };
    }
    if (body?.status === 'failed') {
      return { status: 'failed', reason: body.reason ?? 'estimate failed' };
    }
    const items = body?.items ?? [];
    if (items.length === 0) return { status: 'failed', reason: 'nothing recognised' };
    return { status: 'ok', items };
  } catch (e) {
    return { status: 'failed', reason: e instanceof Error ? e.message : 'estimate failed' };
  }
}
