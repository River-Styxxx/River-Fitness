/**
 * Single typed data-access module. All queries live here — no raw supabase
 * calls in components (spec: one data-access layer).
 */
import { supabase } from '../lib/supabase';
import type { Tables, TablesInsert } from '../lib/database.types';

export type Client = Tables<'clients'>;
export type FoodLogEntry = Tables<'food_log_entries'>;
export type FoodItem = Tables<'food_items'>;
export type DailySummary = Tables<'v_daily_summary'>;
export type WeekSummary = Tables<'v_program_week_summary'>;
export type NutritionTarget = Tables<'nutrition_targets'>;
export type StandingInstruction = Tables<'standing_instructions'>;
export type ClientReport = Tables<'client_reports'>;

function throwIf<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('no data');
  return data;
}

// ---------- session / role ----------
export async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export type Role = 'coach' | 'client' | 'none';

export async function resolveRole(): Promise<{
  role: Role;
  client: Client | null;
  tenantId: string | null;
}> {
  const uid = await getSessionUserId();
  if (!uid) return { role: 'none', client: null, tenantId: null };
  const roles = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', uid)
    .is('ended_at', null);
  // a coach is a client of their own practice — always resolve their own row too
  const me = await supabase.from('clients').select('*').eq('claimed_user_id', uid).is('deleted_at', null).limit(1);
  const client = me.data?.[0] ?? null;
  const coachRow = (roles.data ?? []).find((r) => r.role === 'coach' || r.role === 'admin');
  if (coachRow) return { role: 'coach', client, tenantId: coachRow.tenant_id };
  return client
    ? { role: 'client', client, tenantId: client.tenant_id }
    : { role: 'none', client: null, tenantId: null };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------- client-side data ----------
export async function getDailySummaries(clientId: string, limitDays = 60): Promise<DailySummary[]> {
  const r = await supabase
    .from('v_daily_summary')
    .select('*')
    .eq('client_id', clientId)
    .order('local_date', { ascending: false })
    .limit(limitDays);
  return throwIf(r.data, r.error);
}

export async function getWeekSummaries(clientId: string): Promise<WeekSummary[]> {
  const r = await supabase
    .from('v_program_week_summary')
    .select('*')
    .eq('client_id', clientId)
    .order('program_week', { ascending: false });
  return throwIf(r.data, r.error);
}

export async function getEntriesForDate(clientId: string, localDate: string): Promise<FoodLogEntry[]> {
  const r = await supabase
    .from('food_log_entries')
    .select('*')
    .eq('client_id', clientId)
    .eq('local_date', localDate)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return throwIf(r.data, r.error);
}

export async function getTargets(clientId: string): Promise<NutritionTarget[]> {
  const r = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .order('effective_date', { ascending: false });
  return throwIf(r.data, r.error);
}

export async function getInstructions(clientId: string): Promise<StandingInstruction[]> {
  const r = await supabase
    .from('standing_instructions')
    .select('*')
    .eq('client_id', clientId)
    .eq('active', true)
    .is('deleted_at', null)
    .order('position', { ascending: true });
  return throwIf(r.data, r.error);
}

export async function getPublishedReports(clientId: string): Promise<ClientReport[]> {
  const r = await supabase
    .from('client_reports')
    .select('*')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  return throwIf(r.data, r.error);
}

/** Client-generated UUID (offline-first: id minted on device, idempotent upsert). */
export function newId(): string {
  // RFC4122 v4 without external deps
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type MealItemInput = {
  description: string;
  qty?: string;
  /** canonical grams — units are a display concern, nothing else stores oz */
  weightG?: number | null;
  /** what the client actually typed, so reopening shows their number back */
  enteredValue?: number | null;
  enteredUnit?: string | null;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  foodItemId?: string;
};

/**
 * Logs a meal as one row per food, sharing a client-generated meal_id.
 *
 * Macros can arrive two ways. Per item, they ride on that item's row. Entered
 * once for the whole meal, they land on the first row and the rest stay null —
 * either way the daily and weekly views sum to the same number, because they
 * sum rows.
 *
 * A row with no macros is `pending`: the log is never blocked on numbers.
 * Returns the meal_id so attachments can be hung off it.
 */
export async function logMeal(input: {
  clientId: string;
  tenantId: string;
  items: MealItemInput[];
  mealMacros?: { kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
  /** ISO instant for the meal; omitted means now. local_date follows from it. */
  at?: string | null;
  /** which inaccuracy tier fired and what the client was shown */
  tier?: { id: number; pct: number } | null;
}): Promise<string> {
  const items = input.items.filter((i) => i.description.trim().length > 0);
  if (items.length === 0) throw new Error('nothing to log');

  const mealId = newId();
  const anyPerItem = items.some(
    (i) => i.kcal != null || i.protein_g != null || i.carbs_g != null || i.fat_g != null
  );

  const rows: TablesInsert<'food_log_entries'>[] = items.map((item, idx) => {
    // meal-level numbers only apply when no per-item breakdown was given
    const macros =
      !anyPerItem && idx === 0 && input.mealMacros
        ? input.mealMacros
        : { kcal: item.kcal, protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g };

    return {
      id: newId(),
      meal_id: mealId,
      tenant_id: input.tenantId,
      client_id: input.clientId,
      description: item.description.trim(),
      qty: item.qty?.trim() || null,
      kcal: macros.kcal ?? null,
      protein_g: macros.protein_g ?? null,
      carbs_g: macros.carbs_g ?? null,
      fat_g: macros.fat_g ?? null,
      food_item_id: item.foodItemId ?? null,
      weight_g: item.weightG ?? null,
      entered_value: item.enteredValue ?? null,
      entered_unit: item.enteredUnit ?? null,
      tier_id: input.tier?.id ?? null,
      tier_pct: input.tier?.pct ?? null,
      ...(input.at ? { at: input.at } : {}),
      status: macros.kcal != null ? 'estimated' : 'pending',
      source: 'app',
    };
  });

  const { error } = await supabase.from('food_log_entries').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return mealId;
}

export async function searchFoodItems(q: string, limit = 20): Promise<FoodItem[]> {
  const r = await supabase
    .from('food_items')
    .select('*')
    .ilike('name', `%${q}%`)
    .is('deleted_at', null)
    .order('name')
    .limit(limit);
  return throwIf(r.data, r.error);
}

// ---------- coach-side data ----------
export async function listClients(): Promise<Client[]> {
  const uid = await getSessionUserId();
  let q = supabase.from('clients').select('*').is('deleted_at', null);
  // the coach's own client row belongs under "My log", not in their caseload
  if (uid) q = q.or(`claimed_user_id.is.null,claimed_user_id.neq.${uid}`);
  const r = await q.order('display_name');
  return throwIf(r.data, r.error);
}

export async function getClient(clientId: string): Promise<Client> {
  const r = await supabase.from('clients').select('*').eq('id', clientId).single();
  return throwIf(r.data, r.error);
}

export async function getLatestDailyAcrossClients(): Promise<DailySummary[]> {
  const r = await supabase
    .from('v_daily_summary')
    .select('*')
    .order('local_date', { ascending: false })
    .limit(400);
  return throwIf(r.data, r.error);
}

// ---------- meal photos ----------

export type MealPhotoUpload = { kind: 'top' | 'angle' | 'label'; blob: Blob };

/**
 * Uploads a meal's photos and records them as attachments.
 *
 * Path is `{client_id}/{meal_id}/{kind}.jpg` — the storage policies read the
 * client id straight out of the first folder segment, so a client can only
 * write under their own id and a coach can only read within their tenant.
 *
 * Photos never block the log: the meal rows are committed before this runs, so
 * a dead connection costs a photo, not someone's dinner.
 */
export async function uploadMealPhotos(input: {
  clientId: string;
  tenantId: string;
  mealId: string;
  photos: MealPhotoUpload[];
}): Promise<{ uploaded: number; failed: string[] }> {
  const failed: string[] = [];
  let uploaded = 0;

  for (const photo of input.photos) {
    const path = `${input.clientId}/${input.mealId}/${photo.kind}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('meal-photos')
      .upload(path, photo.blob, { contentType: 'image/jpeg', upsert: true });

    if (upErr) {
      failed.push(`${photo.kind}: ${upErr.message}`);
      continue;
    }

    const row: TablesInsert<'attachments'> = {
      tenant_id: input.tenantId,
      entity_type: 'meal',
      entity_id: input.mealId,
      storage_path: path,
      kind: photo.kind === 'label' ? 'nutrition_label' : `meal_${photo.kind}`,
    };
    const { error: rowErr } = await supabase.from('attachments').insert(row);
    if (rowErr) failed.push(`${photo.kind} record: ${rowErr.message}`);
    else uploaded++;
  }

  return { uploaded, failed };
}

/** Attachments for a set of meals. */
export async function getMealAttachments(mealIds: string[]): Promise<Tables<'attachments'>[]> {
  if (mealIds.length === 0) return [];
  const r = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', 'meal')
    .in('entity_id', mealIds)
    .is('deleted_at', null);
  return throwIf(r.data, r.error);
}

/** Private bucket: every view is a short-lived signed URL, never a public path. */
export async function signedPhotoUrl(storagePath: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('meal-photos')
    .createSignedUrl(storagePath, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
