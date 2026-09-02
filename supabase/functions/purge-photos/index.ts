/**
 * purge-photos — the executor.
 *
 * It makes no decisions. `photo_purge_plan()` in the database decides what goes
 * and why; this deletes the bytes and writes down what it did. Keeping the
 * judgement in SQL is what makes the whole thing dry-runnable and testable
 * without deleting anything.
 *
 * Two things it will never touch:
 *   - the progress-photos bucket, which it does not name anywhere
 *   - *.thumb.jpg, which the plan excludes — those outlive the originals so an
 *     old review still has something to show
 *
 * Auth: a shared secret in PURGE_TOKEN, compared against the x-purge-token
 * header. Without that env var set the function refuses to run at all rather
 * than defaulting to open — the anon key is public, so it is not a lock.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type PlanRow = {
  storage_path: string;
  attachment_id: string | null;
  client_id: string | null;
  bytes: number;
  age_days: number;
  action: 'expired' | 'pressure' | 'escalate';
  detail: string;
};

Deno.serve(async (req) => {
  const expected = Deno.env.get('PURGE_TOKEN');
  if (!expected) {
    return json({ error: 'PURGE_TOKEN is not set on this function; refusing to run' }, 503);
  }
  if (req.headers.get('x-purge-token') !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: policy, error: pErr } = await db
    .from('photo_policy').select('*').eq('id', 'meal').single();
  if (pErr) return json({ error: `policy: ${pErr.message}` }, 500);

  // an explicit ?dry_run= wins, so a run can be previewed without touching config
  const url = new URL(req.url);
  const override = url.searchParams.get('dry_run');
  const dryRun = override == null ? !!policy.dry_run : override !== 'false';

  const { data: plan, error: planErr } = await db.rpc('photo_purge_plan');
  if (planErr) return json({ error: `plan: ${planErr.message}` }, 500);

  const rows = (plan ?? []) as PlanRow[];
  const doomed = rows.filter((r) => r.action !== 'escalate');
  const escalate = rows.filter((r) => r.action === 'escalate');
  const runId = crypto.randomUUID();

  let deleted = 0;
  let freed = 0;
  const audit: Record<string, unknown>[] = [];

  for (const r of doomed) {
    let outcome = 'planned';
    if (!dryRun) {
      // the thumbnail is NOT in this list and is deliberately left behind
      const { error } = await db.storage.from('meal-photos').remove([r.storage_path]);
      if (error) {
        outcome = `failed: ${error.message}`;
      } else {
        outcome = 'deleted';
        deleted++;
        freed += Number(r.bytes ?? 0);
        // the attachment row goes soft, so an old review can still find the thumb
        if (r.attachment_id) {
          await db.from('attachments')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', r.attachment_id);
        }
      }
    }
    audit.push({
      run_id: runId,
      storage_path: r.storage_path,
      attachment_id: r.attachment_id,
      client_id: r.client_id,
      bytes: r.bytes,
      reason: r.action,
      dry_run: dryRun,
      outcome,
    });
  }

  // escalations are recorded too — a photo nobody read the numbers off is the
  // one thing here worth a coach's attention, and it must not just be a log line
  for (const r of escalate) {
    audit.push({
      run_id: runId,
      storage_path: r.storage_path,
      attachment_id: r.attachment_id,
      client_id: r.client_id,
      bytes: r.bytes,
      reason: 'escalate',
      dry_run: dryRun,
      outcome: r.detail,
    });
  }

  if (audit.length > 0) {
    const { error } = await db.from('photo_purge_audit').insert(audit);
    if (error) return json({ error: `audit: ${error.message}`, runId }, 500);
  }

  return json({
    runId,
    dryRun,
    planned: doomed.length,
    deleted,
    freedBytes: freed,
    escalated: escalate.length,
    escalations: escalate.map((e) => ({ path: e.storage_path, why: e.detail, ageDays: e.age_days })),
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
