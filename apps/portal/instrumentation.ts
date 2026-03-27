const DEFAULT_SYNC_INTERVAL_MS = 5_000;
const DEFAULT_STARTUP_DELAY_MS = 3_000;
const DEFAULT_PORT = 3002;

type SyncLoopState = {
  started: boolean;
  running: boolean;
  timer: NodeJS.Timeout | null;
  startupTimer: NodeJS.Timeout | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __infinityPortalSyncLoop__: SyncLoopState | undefined;
}

function getLoopState(): SyncLoopState {
  if (!globalThis.__infinityPortalSyncLoop__) {
    globalThis.__infinityPortalSyncLoop__ = {
      started: false,
      running: false,
      timer: null,
      startupTimer: null,
    };
  }
  return globalThis.__infinityPortalSyncLoop__;
}

function readMsEnv(name: string, fallback: number) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}

function isLoopEnabled() {
  const runtime = String(process.env.NEXT_RUNTIME || "").trim();
  if (runtime && runtime !== "nodejs") {
    return false;
  }

  const flag = String(process.env.PORTAL_INTERNAL_SYNC_LOOP || "").trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(flag);
}

function getInternalSyncBaseUrl() {
  const explicit = String(process.env.PORTAL_INTERNAL_SYNC_BASE_URL || "").trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const port = readMsEnv("PORT", DEFAULT_PORT);
  return `http://127.0.0.1:${port}`;
}

async function runInternalSyncRequest(pathname: string, secret: string | null) {
  const baseUrl = getInternalSyncBaseUrl();
  const url = new URL(pathname, `${baseUrl}/`);
  if (secret) {
    url.searchParams.set("secret", secret);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-portal-internal-sync": "1",
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const errorText =
      typeof body?.error === "string" && body.error
        ? body.error
        : `HTTP ${response.status}`;
    throw new Error(`${pathname} failed: ${errorText}`);
  }

  return body;
}

async function runSyncTick() {
  const state = getLoopState();
  if (state.running) {
    return;
  }

  const secret = String(process.env.CRON_SYNC_BOOKINGS_SECRET || "").trim() || null;

  state.running = true;
  try {
    const [bookingResult, registrationResult] = await Promise.all([
      runInternalSyncRequest("/api/cron/sync-db-bookings", secret),
      runInternalSyncRequest("/api/cron/sync-db-registrations", secret),
    ]);

    console.log(
      `[portal-sync-loop] bookings=${bookingResult?.synced ?? "?"}/${bookingResult?.examined ?? "?"} imported=${bookingResult?.importedFromApp ?? "?"} actions=${bookingResult?.actionsProcessed ?? "?"} registrations=${registrationResult?.synced ?? "?"}/${registrationResult?.examined ?? "?"}`,
    );
  } catch (error) {
    console.error("[portal-sync-loop] sync failed", error);
  } finally {
    state.running = false;
  }
}

export function register() {
  if (!isLoopEnabled()) {
    return;
  }

  const state = getLoopState();
  if (state.started) {
    return;
  }
  state.started = true;

  const intervalMs = Math.max(
    5_000,
    readMsEnv("PORTAL_SYNC_INTERVAL_MS", DEFAULT_SYNC_INTERVAL_MS),
  );
  const startupDelayMs = Math.max(
    1_000,
    readMsEnv("PORTAL_SYNC_STARTUP_DELAY_MS", DEFAULT_STARTUP_DELAY_MS),
  );

  console.log(
    `[portal-sync-loop] enabled interval=${intervalMs}ms startupDelay=${startupDelayMs}ms`,
  );

  state.startupTimer = setTimeout(() => {
    void runSyncTick();
    state.timer = setInterval(() => {
      void runSyncTick();
    }, intervalMs);
    state.timer.unref?.();
  }, startupDelayMs);
  state.startupTimer.unref?.();
}
