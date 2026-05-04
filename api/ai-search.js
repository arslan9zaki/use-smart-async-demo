// ─── SIMPLE IN-MEMORY STORE (for demo SaaS) ─────────────
// ⚠️ In production, replace with database (MongoDB, Supabase)
const usageStore = {}; // { userId: { count, lastReset, plan } }

const FREE_LIMIT = 10;     // free users per minute
const PRO_LIMIT = 100;     // paid users per minute

function getUserId(req) {
  // simple user identity (replace with auth later)
  return req.headers["x-user-id"] || req.socket.remoteAddress;
}

function getUserData(userId) {
  if (!usageStore[userId]) {
    usageStore[userId] = {
      count: 0,
      lastReset: Date.now(),
      plan: "free" // change to "pro" for paid users
    };
  }
  return usageStore[userId];
}

function checkLimit(user) {
  const now = Date.now();

  // reset every 60 seconds
  if (now - user.lastReset > 60000) {
    user.count = 0;
    user.lastReset = now;
  }

  const limit = user.plan === "pro" ? PRO_LIMIT : FREE_LIMIT;

  if (user.count >= limit) {
    return false;
  }

  user.count++;
  return true;
}

module.exports = async function handler(req, res) {
  // ─── CORS ─────────────────────────────────────────────
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

    const userId = getUserId(req);
    const user = getUserData(userId);

    // ─── USAGE LIMIT CHECK ───────────────────────────────
    if (!checkLimit(user)) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        plan: user.plan,
        upgrade: "Upgrade to PRO for higher limits"
      });
    }

    const { query } = req.body || {};

    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    // ─── AI PROMPT ──────────────────────────────────────
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
    {
      "name": "",
      "location": "",
      "description": ""
    }
  ],
  "tips": []
}
`;

    // ─── OPENAI CALL ────────────────────────────────────
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

    if (!aiRes.ok) {
      return res.status(500).json({
        error: "AI API failed",
        details: aiData
      });
    }

    const raw = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "Invalid AI response",
        raw
      });
    }

    // ─── ADD USAGE INFO TO RESPONSE ─────────────────────
    const limit = user.plan === "pro" ? PRO_LIMIT : FREE_LIMIT;

    return res.status(200).json({
      ...parsed,
      usage: {
        plan: user.plan,
        remaining: Math.max(0, limit - user.count),
        limit
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};
