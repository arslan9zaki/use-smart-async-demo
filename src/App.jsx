import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:4000"; // swap to your Railway/Render URL in prod

// ─── authFetch (module-level — no hooks) ─────────────────────────────────────
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("sp_token");
  try {
    return await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    console.error("[authFetch] Network error:", err);
    throw err;
  }
}

// ─── useSmartAsync ────────────────────────────────────────────────────────────
function useSmartAsync({ fn, onSuccess, onError, debounceMs = 0 }) {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);
  const abortRef     = useRef(null);
  const debounceRef  = useRef(null);
  const fnRef        = useRef(fn);
  const successRef   = useRef(onSuccess);
  const errorRef     = useRef(onError);

  useEffect(() => { fnRef.current      = fn;        }, [fn]);
  useEffect(() => { successRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { errorRef.current   = onError;   }, [onError]);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(debounceRef.current);
  }, []);

  const normalizeError = (err) => {
    if (!err) return "Something went wrong.";
    if (typeof err !== "object") return String(err);
    if (err.name === "AbortError") return null;
    if (err.message === "SESSION_EXPIRED") return "Session expired. Please log in again.";
    return err.message || "Something went wrong.";
  };

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    clearTimeout(debounceRef.current);
    requestIdRef.current++;
    setLoading(false);
  }, []);

  const run = useCallback((...args) => {
    return new Promise((resolve, reject) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);
        try {
          const result = await fnRef.current({ signal: abortRef.current.signal, args });
          if (requestId !== requestIdRef.current) { resolve(undefined); return; }
          setData(result);
          successRef.current?.(result);
          resolve(result);
        } catch (err) {
          if (requestId !== requestIdRef.current) { resolve(undefined); return; }
          const message = normalizeError(err);
          if (!message) { resolve(undefined); return; }
          setError(message);
          errorRef.current?.(message);
          reject(new Error(message));
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      }, debounceMs);
    });
  }, [debounceMs]);

  return { data, error, loading, run, cancel };
}

// ─── Mock data (used when backend unreachable) ────────────────────────────────
const MOCK = {
  default: { summary: "Strong sourcing opportunity in Southeast Asia with competitive pricing and growing capacity.", bestSupplierType: "Contract Manufacturer", estimatedPriceRange: "$4–$9/unit", riskLevel: "Low",    suggestedCountry: "Vietnam", tips: ["Request factory audit reports", "Negotiate 30% deposit", "Ask for OEKO-TEX certification"] },
  china:   { summary: "China leads in electronics and high-volume production despite ongoing supply chain shifts.",   bestSupplierType: "OEM/ODM Manufacturer",    estimatedPriceRange: "$2–$6/unit", riskLevel: "Medium", suggestedCountry: "China",   tips: ["Use Trade Assurance for payment protection", "Verify Gold Supplier status", "Allow 30–45 day lead times"] },
  india:   { summary: "India excels in textiles and IT components with strong English communication.",                bestSupplierType: "Specialist Manufacturer",  estimatedPriceRange: "$3–$8/unit", riskLevel: "Low",    suggestedCountry: "India",   tips: ["GOTS cert available for organic textiles", "Check BIS compliance for electronics", "Bangalore and Surat are key hubs"] },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const RISK_COLOR = { Low: "#4ade80", Medium: "#facc15", High: "#f87171" };

function RiskBadge({ level }) {
  const c = RISK_COLOR[level] || "#6b7280";
  return <span style={{ background: `${c}20`, color: c, border: `1px solid ${c}44`, fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{level} Risk</span>;
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1f2d45", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ color: "#4b5563", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ResultsPanel({ data }) {
  return (
    <div style={{ marginTop: 20, padding: "20px 22px", background: "linear-gradient(135deg,rgba(59,130,246,0.07),rgba(139,92,246,0.07))", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 16, animation: "fadeIn 0.35s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>✨</span>
          <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Sourcing Intelligence</span>
        </div>
        <RiskBadge level={data.riskLevel} />
      </div>
      <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.75, marginBottom: 16 }}>{data.summary}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        <StatCard label="Supplier Type" value={data.bestSupplierType} />
        <StatCard label="Price Range"   value={data.estimatedPriceRange} />
        <StatCard label="Top Country"   value={data.suggestedCountry} />
      </div>
      {data.tips?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {data.tips.map((t, i) => <span key={i} style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)", fontSize: 12, padding: "4px 12px", borderRadius: 20 }}>💡 {t}</span>)}
        </div>
      )}
    </div>
  );
}

function HookState({ loading, hasData, hasError, completions, quota }) {
  const states = [
    { label: "idle",    active: !loading && !hasData && !hasError, color: "#6b7280" },
    { label: "loading", active: loading,                           color: "#60a5fa" },
    { label: "success", active: !loading && hasData,               color: "#4ade80" },
    { label: "error",   active: !loading && hasError,              color: "#f87171" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "#4b5563", fontSize: 11 }}>hook state →</span>
        {states.map(s => (
          <span key={s.label} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: s.active ? 700 : 400, background: s.active ? `${s.color}20` : "rgba(255,255,255,0.03)", color: s.active ? s.color : "#374151", border: `1px solid ${s.active ? s.color + "55" : "#1f2d45"}`, transition: "all 0.2s" }}>{s.label}</span>
        ))}
        <span style={{ color: "#374151", fontSize: 11, marginLeft: 4 }}>
          completions: <strong style={{ color: "#6b7280" }}>{completions}</strong>
        </span>
      </div>
      {quota.remaining !== null && (
        <div style={{ fontSize: 11, color: quota.remaining <= 5 ? "#f87171" : quota.remaining <= 10 ? "#facc15" : "#4ade80" }}>
          🔢 {quota.remaining}/{quota.limit} requests remaining this minute
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [query,       setQuery]       = useState("");
  const [submittedQ,  setSubmittedQ]  = useState("");
  const [completions, setCompletions] = useState(0);
  const [quota,       setQuota]       = useState({ remaining: null, limit: 20 });
  const [log,         setLog]         = useState([]);
  const [useMock,     setUseMock]     = useState(true); // toggle for demo

  // quotaRef lets apiFn write headers without needing state inside the fn
  const quotaRef = useRef({ remaining: null, limit: 20 });

  const addLog = useCallback((msg, color = "#6b7280") =>
    setLog(l => [{ text: `[${new Date().toLocaleTimeString()}] ${msg}`, color }, ...l].slice(0, 8)),
  []);

  // apiFn defined with useCallback so it's stable across renders
  const apiFn = useCallback(async ({ signal, args: [query] }) => {
    // Mock mode — no backend needed for demo
    if (useMock) {
      await new Promise((res, rej) => {
        const t = setTimeout(res, 800 + Math.random() * 500);
        signal.addEventListener("abort", () => { clearTimeout(t); rej(new DOMException("Aborted", "AbortError")); });
      });
      const key = query.toLowerCase().includes("china") ? "china"
                : query.toLowerCase().includes("india") ? "india" : "default";
      return MOCK[key];
    }

    // Real backend mode
    const res = await authFetch(`${API_BASE}/api/ai-search`, {
      method: "POST",
      body: JSON.stringify({ query }),
      signal,
    });
    if (!res) return;
    if (!res.ok) {
      let errData;
      try   { errData = await res.json(); }
      catch { errData = {}; }
      if (res.status === 401) throw new Error("SESSION_EXPIRED");
      throw new Error(errData?.error || `Request failed (${res.status})`);
    }
    // Read rate limit headers before consuming body
    const remaining = parseInt(res.headers.get("X-RateLimit-Remaining"), 10);
    const limit     = parseInt(res.headers.get("X-RateLimit-Limit"),     10);
    quotaRef.current = {
      remaining: Number.isFinite(remaining) ? remaining : null,
      limit:     Number.isFinite(limit)     ? limit     : 20,
    };
    return res.json();
  }, [useMock]);

  const { data, error, loading, run, cancel } = useSmartAsync({
    fn: apiFn,
    debounceMs: 400,
    onSuccess: (d) => {
      if (!d) return;
      setCompletions(c => c + 1);
      setQuota({ ...quotaRef.current });
      addLog(`✅ Result: ${d.suggestedCountry} · ${d.riskLevel} risk`, "#4ade80");
    },
    onError: (msg) => {
      if (msg === "Session expired. Please log in again.") {
        addLog("🔐 Session expired — redirecting…", "#f59e0b");
        setTimeout(() => { localStorage.removeItem("sp_token"); window.location.href = "/"; }, 1500);
        return;
      }
      addLog(`❌ Error: ${msg}`, "#f87171");
    },
  });

  const handleChange = (val) => {
    setQuery(val);
    if (val.trim()) {
      setSubmittedQ(val);
      addLog(`⌨️ Input: "${val}"`, "#6b7280");
      run(val);
    }
  };

  const handleCancel = () => {
    cancel();
    addLog("🚫 Cancelled by user", "#facc15");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080e1a; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #1f2d45; border-radius: 3px; }
        input::placeholder { color: #374151; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080e1a", fontFamily: "'DM Sans',sans-serif", color: "#f1f5f9", padding: "40px 24px 60px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 32, animation: "fadeIn 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌐</div>
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 20 }}>
                  useSmartAsync <span style={{ color: "#60a5fa" }}>Demo</span>
                </span>
              </div>
              {/* Mock / Real toggle */}
              <button onClick={() => setUseMock(v => !v)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: useMock ? "#8b5cf644" : "#3b82f644", background: useMock ? "rgba(139,92,246,0.1)" : "rgba(59,130,246,0.1)", color: useMock ? "#c4b5fd" : "#60a5fa" }}>
                {useMock ? "🧪 Mock API" : "🌐 Real API"}
              </button>
            </div>
            <p style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.7 }}>
              Live demo of <code style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "1px 6px", borderRadius: 4 }}>useSmartAsync</code> — debounce · cancellation · race protection · error normalization. Toggle between mock and real backend above.
            </p>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
            <input value={query} onChange={e => handleChange(e.target.value)}
              placeholder='Try "cotton hoodies Vietnam" or "electronics China"…'
              style={{ width: "100%", padding: "15px 52px 15px 48px", background: "rgba(255,255,255,0.04)", border: "1px solid #1f2d45", borderRadius: 14, color: "#f1f5f9", fontSize: 14, outline: "none" }}
              onFocus={e => (e.target.style.borderColor = "#3b82f6")}
              onBlur={e  => (e.target.style.borderColor = "#1f2d45")}
            />
            {loading && <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, border: "2px solid #1f2d45", borderTop: "2px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, minHeight: 32 }}>
            {loading && <button onClick={handleCancel} style={{ padding: "6px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Cancel</button>}
            {(data || error) && !loading && <button onClick={() => { setQuery(""); setSubmittedQ(""); }} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid #1f2d45", borderRadius: 8, color: "#6b7280", fontSize: 12, cursor: "pointer" }}>Clear</button>}
          </div>

          {/* Hook state */}
          <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid #1f2d45", borderRadius: 10, marginBottom: 20 }}>
            <HookState loading={loading} hasData={!!data} hasError={!!error} completions={completions} quota={quota} />
          </div>

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, color: "#f87171", fontSize: 14, marginBottom: 16 }}>⚠ {error}</div>
          )}

          {/* Results */}
          {data && !loading && <ResultsPanel data={data} />}

          {/* Empty state */}
          {!data && !loading && !error && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#374151" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧪</div>
              <div style={{ fontSize: 14 }}>Type a sourcing query to see the hook in action</div>
              <div style={{ fontSize: 12, marginTop: 6, color: "#2d3748" }}>400ms debounce · AbortController · requestId race guard</div>
            </div>
          )}

          {/* Activity log */}
          {log.length > 0 && (
            <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid #1f2d45", borderRadius: 12 }}>
              <div style={{ color: "#4b5563", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Activity log</div>
              {log.map((entry, i) => (
                <div key={i} style={{ fontSize: 12, color: entry.color, padding: "3px 0", borderBottom: i < log.length - 1 ? "1px solid #0f1929" : "none" }}>{entry.text}</div>
              ))}
            </div>
          )}

          {/* Deploy instructions */}
          <div style={{ marginTop: 28, padding: "14px 16px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10 }}>
            <div style={{ color: "#3b82f6", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>To connect your real backend</div>
            <code style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.9, display: "block" }}>
              {`1. Set API_BASE = "https://your-api.onrender.com"`}<br />
              {`2. app.use(cors({ origin: "https://your-frontend.vercel.app" }))`}<br />
              {`3. localStorage.setItem("sp_token", data.token)  // on login`}<br />
              {`4. Toggle "Real API" button above`}
            </code>
          </div>

        </div>
      </div>
    </>
  );
}
