import { useState, useEffect } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Usage limit (FREE PLAN) ─────────────────────────
  const [usage, setUsage] = useState(() => {
    return Number(localStorage.getItem("usage") || 0);
  });

  const LIMIT = 5;

  const search = async () => {
    if (!query) return;

    if (usage >= LIMIT) {
      alert("Free limit reached. Upgrade to PRO.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const json = await res.json();

      setData(json);

      const newUsage = usage + 1;
      setUsage(newUsage);
      localStorage.setItem("usage", newUsage);
    } catch (err) {
      alert("Error");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>🌍 Global Sourcing AI</h1>

      {/* PLAN INFO */}
      <div style={{ marginBottom: 20 }}>
        <b>Free Plan:</b> {usage}/{LIMIT} searches used
      </div>

      {/* INPUT */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search suppliers (e.g. china electronics)"
        style={{ width: "100%", padding: 10 }}
      />

      <br /><br />

      <button onClick={search} style={{ padding: 10 }}>
        Search
      </button>

      {loading && <p>Loading...</p>}

      {/* RESULTS */}
      {data && (
        <div style={{ marginTop: 30 }}>
          <h2>{data.suggestedCountry}</h2>
          <p>{data.summary}</p>

          <p><b>Type:</b> {data.bestSupplierType}</p>
          <p><b>Price:</b> {data.estimatedPriceRange}</p>
          <p><b>Risk:</b> {data.riskLevel}</p>

          <h3>Suppliers</h3>
          <ul>
            {data.suppliers?.map((s, i) => (
              <li key={i}>
                <b>{s.name}</b> — {s.location}
                <br />
                {s.description}
              </li>
            ))}
          </ul>

          <h3>Tips</h3>
          <ul>
            {data.tips?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
