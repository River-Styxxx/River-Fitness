import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Forced updates.
 *
 * A cold start already picks up a new build — the service worker is
 * network-first, so reopening the app fetches a fresh index.html and its
 * content-hashed bundle. The case this exists for is the session left open:
 * a PWA sitting on a home screen for days is running JavaScript loaded on
 * Monday and will never learn otherwise on its own.
 *
 * That matters most when the database changes underneath it. Old code writing
 * rows in a shape the schema no longer expects is silent corruption, not a
 * cosmetic staleness problem — so the floor lives server-side, in
 * `app_release.min_build`, and applies to builds already in the wild without
 * shipping anything.
 *
 * Raising the floor:
 *   update app_release set min_build = '<the deploy that must be running>',
 *          updated_at = now()
 *   where id = 'web';
 *
 * Every open session picks it up on its next check and reloads. No prompt —
 * but never mid-sentence: a reload is held while someone is typing into a
 * sheet, and fires the moment they are done.
 */

export const BUILD_ID: string =
  (Constants.expoConfig?.extra as { buildId?: string } | undefined)?.buildId ?? '1970-01-01T00:00:00.000Z';

const CHECK_EVERY_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* holding a reload while someone is mid-edit                          */
/* ------------------------------------------------------------------ */

let holds = 0;
let pendingReload = false;

/** Called by any sheet that owns unsaved typing. Returns the release fn. */
export function holdReload(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    if (holds === 0 && pendingReload) doReload();
  };
}

function doReload() {
  pendingReload = false;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // replace() rather than reload() so the stale entry cannot be reached with Back
    window.location.replace(window.location.href.split('#')[0]);
  }
}

/* ------------------------------------------------------------------ */

async function minBuild(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_release')
    .select('min_build')
    .eq('id', 'web')
    .maybeSingle();
  if (error || !data) return null;
  return data.min_build;
}

/** true when this build is below the floor the server is advertising */
export async function isStale(): Promise<boolean> {
  const floor = await minBuild();
  return floor != null && BUILD_ID < floor;
}

/**
 * The second trigger: a newer build is simply sitting on the host.
 *
 * The running bundle's filename is content-hashed, so comparing the script tag
 * in a freshly fetched index.html against the one this page loaded says whether
 * a deploy has happened — without CI having to publish a version file or the
 * floor having to be raised by hand. Routine deploys land on their own; the
 * server floor stays for the case where that is not fast enough.
 */
function runningBundle(): string | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const tags = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
  const src = tags.map((t) => t.src).find((u) => u.includes('/_expo/static/js/web/'));
  return src ? src.split('/').pop() ?? null : null;
}

async function newerBundleDeployed(): Promise<boolean> {
  const mine = runningBundle();
  if (!mine || typeof window === 'undefined') return false;
  try {
    const base = window.location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
    const res = await fetch(`${base}index.html?cb=${Date.now()}`, { cache: 'reload' });
    if (!res.ok) return false;
    const html = await res.text();
    const m = html.match(/_expo\/static\/js\/web\/(entry-[a-f0-9]+\.js)/);
    return m != null && m[1] !== mine;
  } catch {
    return false; // offline, or the host is unhappy — never a reason to reload
  }
}

async function check() {
  try {
    const [stale, newer] = await Promise.all([isStale(), newerBundleDeployed()]);
    if (!stale && !newer) return;
    if (holds > 0) {
      pendingReload = true; // fires the moment the last sheet closes
      return;
    }
    doReload();
  } catch {
    // a failed check must never take the app down with it
  }
}

/**
 * Start watching. Checks on mount, whenever the app comes back to the
 * foreground, and on a slow timer for a session that simply stays open.
 */
export function watchForForcedUpdate(): () => void {
  void check();
  const timer = setInterval(check, CHECK_EVERY_MS);

  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') void check();
  });

  let onVisible: (() => void) | null = null;
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
  }

  return () => {
    clearInterval(timer);
    sub.remove();
    if (onVisible && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
}
