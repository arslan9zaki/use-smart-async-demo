module.exports = async function handler(req, res) {
  // ✅ ADD THIS BLOCK FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "No query provided" });
    }

    // your existing logic here...

    res.status(200).json({ success: true, query });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
