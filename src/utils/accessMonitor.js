const STORAGE_KEY = "riffTheoryAnonymousBrowserId";
const SESSION_KEY = "riffTheoryAnonymousSessionId";
const CONSENT_KEY = "riffTheoryAccessMetricsConsent";
const FUNCTION_NAME = "register-anonymous-access";

function getOrCreate(key, factory) {
    try {
        const current = localStorage.getItem(key);
        if (current) return current;
        const value = factory();
        localStorage.setItem(key, value);
        return value;
    } catch {
        return null;
    }
}

function randomId() {
    return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadTurnstile() {
    return new Promise((resolve) => {
        if (window.turnstile) return resolve(window.turnstile);
        const script = document.querySelector("script[src*='challenges.cloudflare.com/turnstile']");
        if (!script) return resolve(null);
        const started = Date.now();
        const timer = setInterval(() => {
            if (window.turnstile) {
                clearInterval(timer);
                resolve(window.turnstile);
            } else if (Date.now() - started > 4000) {
                clearInterval(timer);
                resolve(null);
            }
        }, 100);
    });
}

async function getTurnstileToken(siteKey) {
    const turnstile = await loadTurnstile();
    if (!turnstile || !siteKey) return null;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(value || null);
        };
        const container = document.createElement("div");
        container.setAttribute("aria-hidden", "true");
        container.style.cssText = "position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden";
        document.body.appendChild(container);
        try {
            turnstile.render(container, {
                sitekey: siteKey,
                size: "invisible",
                callback: finish,
                "error-callback": () => finish(null),
                "expired-callback": () => finish(null),
            });
            setTimeout(() => finish(null), 8000);
        } catch {
            finish(null);
        }
    });
}

export async function registrarAcessoAnonimo() {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!siteKey || !supabaseUrl) return { sent: false, reason: "not-configured" };

    // A ausência de consentimento nunca bloqueia o site: apenas não envia a métrica.
    try {
        if (localStorage.getItem(CONSENT_KEY) === "denied") {
            return { sent: false, reason: "no-consent" };
        }
    } catch {
        return { sent: false, reason: "storage-unavailable" };
    }

    const token = await getTurnstileToken(siteKey);
    if (!token) return { sent: false, reason: "turnstile-unavailable" };

    const browserId = getOrCreate(STORAGE_KEY, randomId);
    const sessionId = getOrCreate(SESSION_KEY, randomId);
    if (!browserId || !sessionId) return { sent: false, reason: "storage-unavailable" };

    let browserSignature = null;
    try { browserSignature = localStorage.getItem(`${STORAGE_KEY}:signature`); } catch { /* no-op */ }

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ browser_id: browserId, browser_signature: browserSignature, session_id: sessionId, turnstile_token: token }),
        });
        if (!response.ok) return { sent: false, reason: `server-${response.status}` };
        const data = await response.json().catch(() => ({}));
        if (data.browser_id && data.browser_signature) {
            localStorage.setItem(STORAGE_KEY, data.browser_id);
            localStorage.setItem(`${STORAGE_KEY}:signature`, data.browser_signature);
        }
        return { sent: true, data };
    } catch {
        return { sent: false, reason: "network-error" };
    }
}

export function iniciarMonitoramentoDeAcesso() {
    let stopped = false;
    const send = () => {
        if (!stopped && document.visibilityState === "visible") registrarAcessoAnonimo();
    };
    send();
    const onVisible = () => { if (document.visibilityState === "visible") send(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
        stopped = true;
        document.removeEventListener("visibilitychange", onVisible);
    };
}
