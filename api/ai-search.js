// ─── Simple in-memory rate limiter ─────────────────────────────
const RATE_LIMIT = 20; // requests
const WINDOW_MS = 60 * 1000; // 1 minute

const store = new Map();

function rateLimit(ip) {
  const now = Date.now();

  if (!store.has(ip)) {
    store.set(ip, { count: 1, start: now });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  const entry = store.get(ip);

  if (now - entry.start > WINDOW_MS) {
    // reset window
    store.set(ip, { count: 1, start: now });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing API key" });
  }

  const { query } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sourcing expert. Always respond in JSON with: summary, bestSupplierType, estimatedPriceRange, riskLevel, suggestedCountry, tips (array)."
          },
          {
            role: "user",
            content: `Analyze sourcing for: ${query}`
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        summary: text,
        bestSupplierType: "Unknown",
        estimatedPriceRange: "N/A",
        riskLevel: "Medium",
        suggestedCountry: "Global",
        tips: ["Manual review needed"]
      };
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI request failed" });
  }
}
