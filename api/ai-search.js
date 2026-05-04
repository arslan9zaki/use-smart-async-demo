module.exports = async function handler(req, res) {
  // ─── CORS ─────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { query } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    // ─── AI PROMPT (THIS IS YOUR PRODUCT CORE) ───────────
    const prompt = `
You are an expert global sourcing consultant.

User query: "${query}"

Return ONLY valid JSON in this format:

{
  "summary": "short market insight",
  "bestSupplierType": "e.g. Manufacturer / Wholesaler",
  "estimatedPriceRange": "e.g. $2-$5/unit",
  "riskLevel": "Low | Medium | High",
  "suggestedCountry": "best country",
  "suppliers": [
    {
      "name": "company name",
      "location": "city, country",
      "description": "what they specialize in"
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}

Do NOT return text outside JSON.
`;

    // ─── CALL OPENAI ────────────────────────────────────
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You generate structured sourcing intelligence." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      return res.status(500).json({
        error: "AI API failed",
        details: aiData
      });
    }

    const raw = aiData.choices?.[0]?.message?.content || "";

    // ─── SAFE JSON PARSE ────────────────────────────────
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw
      });
    }

    // ─── SUCCESS RESPONSE ───────────────────────────────
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};
