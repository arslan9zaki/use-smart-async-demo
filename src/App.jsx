import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = "";

// ─── authFetch ────────────────────────────────────────────────────────────────
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("sp_token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ─── useSmartAsync ────────────────────────────────────────────────────────────
function useSmartAsync({ fn, onSuccess, onError, debounceMs = 0 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const fnRef = useRef(fn);
  const successRef = useRef(onSuccess);
  const errorRef = useRef(onError);

  useEffect(() => { fnRef.current = fn; }, [fn]);
  useEffect(() => { successRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { errorRef.current = onError; }, [onError]);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(debounceRef.current);
  }, []);

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
          if (requestId !== requestIdRef.current) return;
          setData(result);
          successRef.current?.(result);
          resolve(result);
        } catch (err) {
          if (requestId !== requestIdRef.current) return;
          setError(err.message);
          errorRef.current?.(err.message);
          reject(err);
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      }, debounceMs);
    });
  }, [debounceMs]);

  return { data, error, loading, run, cancel };
}

// ─── Mock base ────────────────────────────────────────────────────────────────
const MOCK = {
  china: {
    summary: "China dominates electronics manufacturing with scale and efficiency.",
    bestSupplierType: "OEM Manufacturer",
    estimatedPriceRange: "$2–$6/unit",
    riskLevel: "Medium",
    suggestedCountry: "China",
    tips: ["Verify supplier ratings", "Use escrow payments", "Check shipping timelines"]
  },
  india: {
    summary: "India is strong in textiles and software services.",
    bestSupplierType: "Specialist Manufacturer",
    estimatedPriceRange: "$3–$8/unit",
    riskLevel: "Low",
    suggestedCountry: "India",
    tips: ["Check certifications", "Focus on export hubs", "Negotiate logistics"]
  }
};

// ─── UI Components ────────────────────────────────────────────────────────────
function ResultsPanel({ data }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>Result</h3>
      <p>{data.summary}</p>
      <p><b>Type:</b> {data.bestSupplierType}</p>
      <p><b>Price:</b> {data.estimatedPriceRange}</p>
      <p><b>Country:</b> {data.suggestedCountry}</p>
      <p><b>Risk:</b> {data.riskLevel}</p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [query, setQuery] = useState("");
  const [useMock, setUseMock] = useState(false);

  const apiFn = useCallback(async ({ signal, args: [query] }) => {

    // ✅ SMART MOCK MODE (FIXED)
    if (useMock) {
      await new Promise((res, rej) => {
        const t = setTimeout(res, 600 + Math.random() * 400);
        signal.addEventListener("abort", () => {
          clearTimeout(t);
          rej(new DOMException("Aborted", "AbortError"));
        });
      });

      const q = query.toLowerCase();

      if (q.includes("china")) return MOCK.china;
      if (q.includes("india")) return MOCK.india;

      // 🔥 dynamic AI-like response
      return {
        summary: `AI suggests exploring "${query}" sourcing with global suppliers.`,
        bestSupplierType: q.includes("electronics") ? "OEM Manufacturer"
          : q.includes("clothing") ? "Textile Exporter"
          : "Global Supplier",
        estimatedPriceRange: `$${Math.floor(Math.random()*5)+2}–$${Math.floor(Math.random()*10)+8}/unit`,
        riskLevel: ["Low","Medium","High"][Math.floor(Math.random()*3)],
        suggestedCountry: ["Vietnam","Bangladesh","Turkey","Indonesia"][Math.floor(Math.random()*4)],
        tips: ["Request samples", "Verify supplier", "Negotiate pricing"]
      };
    }

    // REAL API (future)
    const res = await authFetch(`/api/ai-search`, {
      method: "POST",
      body: JSON.stringify({ query }),
      signal,
    });

    return res.json();
  }, [useMock]);

  const { data, loading, run } = useSmartAsync({
    fn: apiFn,
    debounceMs: 400
  });

  return (
    <div style={{ padding: 40 }}>
      <h2>AI Sourcing Tool</h2>

      <button onClick={() => setUseMock(v => !v)}>
        {useMock ? "Mock Mode" : "Real Mode"}
      </button>

      <br /><br />

      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value) run(e.target.value);
        }}
        placeholder="Type something..."
      />

      {loading && <p>Loading...</p>}

      {data && <ResultsPanel data={data} />}
    </div>
  );
}
