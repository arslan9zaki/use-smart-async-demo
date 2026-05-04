export default async function handler(req, res) {
  try {
    // FIX: ensure body is parsed correctly on Vercel
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const query = body?.query || "";

    console.log("Query received:", query);

    // Simple dynamic logic (to prove it works)
    let country = "Vietnam";
    let risk = "Low";

    if (query.toLowerCase().includes("china")) {
      country = "China";
      risk = "Medium";
    } else if (query.toLowerCase().includes("india")) {
      country = "India";
      risk = "Low";
    }

    return res.status(200).json({
      summary: `AI result for: ${query}`,
      bestSupplierType: "Manufacturer",
      estimatedPriceRange: "$3-$8",
      riskLevel: risk,
      suggestedCountry: country,
      tips: ["Verify supplier", "Negotiate price"],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
