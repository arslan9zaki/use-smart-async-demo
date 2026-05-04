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

    const q = query.toLowerCase();

    // COUNTRY
    let country = "Vietnam";
    if (q.includes("china") || q.includes("electronics")) country = "China";
    else if (q.includes("india") || q.includes("textile")) country = "India";
    else if (q.includes("bangladesh")) country = "Bangladesh";
    else if (q.includes("turkey")) country = "Turkey";
    else if (q.includes("pakistan")) country = "Pakistan";

    // SUPPLIER TYPE
    let supplierType = "Global Supplier";
    if (q.includes("electronics")) supplierType = "OEM Electronics Manufacturer";
    else if (q.includes("clothing") || q.includes("garments"))
      supplierType = "Textile Exporter";
    else if (q.includes("furniture"))
      supplierType = "Bulk Furniture Manufacturer";

    // PRICE
    const base = Math.floor(Math.random() * 5) + 2;
    const high = base + Math.floor(Math.random() * 8) + 5;

    // RISK
    const riskLevels = ["Low", "Medium", "High"];
    const risk = riskLevels[Math.floor(Math.random() * riskLevels.length)];

    // SUPPLIERS
    const suppliers = [
      {
        name: `${country} Prime Industries`,
        location: country,
        description: `Leading ${supplierType.toLowerCase()} specializing in export-grade production.`
      },
      {
        name: `Global Source ${country}`,
        location: country,
        description: `Trusted supplier with international shipping and verified certifications.`
      },
      {
        name: `${country} Export Hub`,
        location: country,
        description: `High-volume supplier offering competitive pricing and bulk deals.`
      }
    ];

    const summary = `AI analysis suggests that "${query}" sourcing is best optimized via ${supplierType} in ${country}. This region offers competitive pricing and scalable production.`;

    return res.status(200).json({
      summary,
      bestSupplierType: supplierType,
      estimatedPriceRange: `$${base}–$${high}/unit`,
      riskLevel: risk,
      suggestedCountry: country,
      suppliers,
      tips: [
        "Request samples before ordering",
        "Verify supplier certifications",
        "Negotiate bulk pricing",
        "Use secure payment methods"
      ]
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};
