// Vercel serverless function — proxies chat to Claude / ChatGPT / Grok.
// API keys live in Vercel environment variables and never touch the frontend.
// Model IDs are easy to change here as providers release new ones.
const MODELS = {
  claude: "claude-sonnet-4-6",
  gpt: "gpt-5.5",
  grok: "grok-4.3",
};

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  // Only signed-in users can use this (protects your API spend from random traffic).
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sbUrl = process.env.VITE_SUPABASE_URL;
    const sbKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !sbUrl || !sbKey) { res.status(401).json({ error: "Please sign in again." }); return; }
    const who = await fetch(`${sbUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: sbKey } });
    if (!who.ok) { res.status(401).json({ error: "Your session expired — sign in again." }); return; }
  } catch { res.status(401).json({ error: "Could not verify your session." }); return; }

  const { provider = "claude", messages = [], system } = req.body || {};
  const sys = system || "You are the assistant inside the user's personal Life Management OS. Be concise, direct, and practical.";

  try {
    // --- Anthropic (Claude) uses its own message format ---
    if (provider === "claude") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) { res.status(400).json({ error: "Claude isn't set up yet — add ANTHROPIC_API_KEY in Vercel." }); return; }
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODELS.claude, max_tokens: 1500, system: sys, messages }),
      });
      const data = await r.json();
      if (!r.ok) { res.status(r.status).json({ error: data?.error?.message || "Claude returned an error." }); return; }
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      res.status(200).json({ text });
      return;
    }

    // --- OpenAI (ChatGPT) and xAI (Grok) share the OpenAI-compatible format ---
    const cfg = provider === "grok"
      ? { url: "https://api.x.ai/v1/chat/completions", key: process.env.XAI_API_KEY, model: MODELS.grok, label: "Grok", env: "XAI_API_KEY" }
      : { url: "https://api.openai.com/v1/chat/completions", key: process.env.OPENAI_API_KEY, model: MODELS.gpt, label: "ChatGPT", env: "OPENAI_API_KEY" };
    if (!cfg.key) { res.status(400).json({ error: `${cfg.label} isn't set up yet — add ${cfg.env} in Vercel.` }); return; }

    const r = await fetch(cfg.url, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: "system", content: sys }, ...messages] }),
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json({ error: data?.error?.message || `${cfg.label} returned an error.` }); return; }
    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "Couldn't reach the AI provider. Try again." });
  }
}
