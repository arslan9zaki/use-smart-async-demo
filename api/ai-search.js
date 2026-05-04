module.exports = async function handler(req, res) {
  // ─── CORS ─────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id");

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

    // ✅ CHECK API KEY
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY"
      });
    }

    const prompt = `
You are an expert global sourcing consultant.

User query: "${query}"

Return ONLY valid JSON:

{
  "summary": "",
  "bestSupplierType": "",
  "estimatedPriceRange": "",
  "riskLevel": "",
  "suggestedCountry": "",
  "suppliers": [
    { "name": "", "location": "", "description": "" }
  ],
  "tips": []
}
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You generate sourcing intelligence." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const aiData = await aiRes.json();

    // 🔥 RETURN REAL ERROR FROM OPENAI
    if (!aiRes.ok) {
      return res.status(500).json({
        error: "AI API Failed",
        details: aiData
      });
    }

    const raw = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Invalid AI JSON",
        raw
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Server crash",
      details: err.message
    });
  }
};
