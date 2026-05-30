export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { system, messages } = req.body;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: system + "\n\nQUAN TRỌNG: JSON phải ngắn gọn. Mỗi string value tối đa 40 ký tự. Mảng risks và catalysts tối đa 2 phần tử. Không dùng ký tự đặc biệt trong JSON.",
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    // Validate JSON có parse được không trước khi trả về
    try {
      const raw = data.content?.map(i => i.text || "").join("").trim();
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e !== -1) JSON.parse(raw.slice(s, e + 1)); // test parse
    } catch(parseErr) {
      return res.status(422).json({ error: "JSON parse failed: " + parseErr.message });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
