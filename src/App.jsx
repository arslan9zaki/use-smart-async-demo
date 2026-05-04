import { useState, useEffect } from "react";

const API_BASE = "";

async function fetchAI(query) {
  const res = await fetch(`${API_BASE}/api/ai-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "free-user"
    },
    body: JSON.stringify({ query })
  });

  return res.json();
}

export default function App() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(0);

  const handleSearch = async () => {
    if (!query) return;

    setLoading(true);
    setData(null);

    try {
      const res = await fetchAI(query);

      if (res.error) {
        alert(res.error);
      } else {
        setData(res);
        setUsage(res.usage?.used || usage + 1);
      }
    } catch (err) {
      alert("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div style={{
      fontFamily: "Arial",
      padding: 40,
      background: "#f5f7fb",
      minHeight: "100vh"
    }}>
      
      {/* HEADER */}
      <h1 style={{ fontSize: 32, marginBottom: 10 }}>
        🌍 Global Sourcing AI
      </h1>

      <p style={{ color: "#555" }}>
        Free Plan: {usage}/5 searches used
      </p>

      {/* SEARCH BOX */}
      <div style={{
        display: "flex",
        gap: 10,
        marginTop: 20
      }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. china electronics suppliers"
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccc"
          }}
        />

        <button
          onClick={handleSearch}
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            border: "none",
            background: "#0070f3",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Search
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <p style={{ marginTop: 20 }}>🔄 Analyzing suppliers...</p>
      )}

      {/* RESULTS */}
      {data && (
        <div style={{
          marginTop: 30,
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
        }}>
          <h2>{data.suggestedCountry}</h2>

          <p style={{ marginTop: 10 }}>
            {data.summary}
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginTop: 20
          }}>
            <div><b>Type:</b> {data.bestSupplierType}</div>
            <div><b>Price:</b> {data.estimatedPriceRange}</div>
            <div><b>Risk:</b> {data.riskLevel}</div>
          </div>

          {/* SUPPLIERS */}
          <div style={{ marginTop: 20 }}>
            <h3>Suppliers</h3>
            <ul>
              {data.suppliers?.map((s, i) => (
                <li key={i}>
                  <b>{s.name}</b> — {s.country}
                  <br />
                  <small>{s.description}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
