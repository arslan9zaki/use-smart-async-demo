import { useState, useEffect, useRef, useCallback } from "react";

// ─── useSmartAsync ─────────────────────────────────────
function useSmartAsync({ fn, onSuccess, onError, debounceMs = 0 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const fnRef = useRef(fn);

  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(debounceRef.current);
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
          const result = await fnRef.current({
            signal: abortRef.current.signal,
            args
          });

          if (requestId !== requestIdRef.current) return;

          setData(result);
          onSuccess?.(result);
          resolve(result);

        } catch (err) {
          if (requestId !== requestIdRef.current) return;

          setError(err.message);
          onError?.(err.message);
          reject(err);

        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      }, debounceMs);
    });
  }, [debounceMs, onSuccess, onError]);

  return { data, error, loading, run };
}

// ─── UI ────────────────────────────────────────────────
function ResultsPanel({ data }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>{data.suggestedCountry}</h3>
      <p>{data.summary}</p>

      <p><b>Type:</b> {data.bestSupplierType}</p>
      <p><b>Price:</b> {data.estimatedPriceRange}</p>
      <p><b>Risk:</b> {data.riskLevel}</p>

      <h4>Suppliers</h4>
      <ul>
        {data.suppliers?.map((s, i) => (
          <li key={i}>
            <b>{s.name}</b> — {s.location}<br />
            {s.description}
          </li>
        ))}
      </ul>

      <h4>Tips</h4>
      <ul>
        {data.tips?.map((t, i) => <li key={i}>{t}</li>)}
      </ul>

      <p>
        Usage: {data.usage?.remaining}/{data.usage?.limit}
      </p>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────
export default function App() {
  const [query, setQuery] = useState("");
  const [useMock, setUseMock] = useState(false);

  const apiFn = useCallback(async ({ signal, args: [query] }) => {

    // ─── REAL API ONLY ─────────────────────────────
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "user123"
      },
      body: JSON.stringify({ query }),
      signal
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;

  }, []);

  const { data, error, loading, run } = useSmartAsync({
    fn: apiFn,
    debounceMs: 400
  });

  return (
    <div style={{ padding: 40 }}>
      <h2>AI Sourcing Tool</h2>

      <input
        value={query}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          if (val.trim()) run(val);
        }}
        placeholder="Type something..."
        style={{
          width: "100%",
          padding: 10,
          marginTop: 20
        }}
      />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && <ResultsPanel data={data} />}
    </div>
  );
}
