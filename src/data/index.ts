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

export async function resolveRole(): Promise<{ role: Role; client: Client | null; tenantId: string | null }> {
  const uid = await getSessionUserId();
  if (!uid) return { role: 'none', client: null, tenantId: null };
  const roles = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', uid)
    .is('ended_at', null);
  const coachRow = (roles.data ?? []).find((r) => r.role === 'coach' || r.role === 'admin');
  if (coachRow) return { role: 'coach', client: null, tenantId: coachRow.tenant_id };
  const me = await supabase.from('clients').select('*').eq('claimed_user_id', uid).is('deleted_at', null).limit(1);
  const client = me.data?.[0] ?? null;
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

export async function addFoodLogEntry(input: {
  clientId: string;
  tenantId: string;
  description: string;
  qty?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  foodItemId?: string;
}): Promise<void> {
  const row: TablesInsert<'food_log_entries'> = {
    id: newId(),
    tenant_id: input.tenantId,
    client_id: input.clientId,
    description: input.description,
    qty: input.qty ?? null,
    kcal: input.kcal ?? null,
    protein_g: input.protein_g ?? null,
    carbs_g: input.carbs_g ?? null,
    fat_g: input.fat_g ?? null,
    food_item_id: input.foodItemId ?? null,
    status: input.kcal != null ? 'estimated' : 'pending',
    source: 'app',
  };
  const { error } = await supabase.from('food_log_entries').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
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
  const r = await supabase.from('clients').select('*').is('deleted_at', null).order('display_name');
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
