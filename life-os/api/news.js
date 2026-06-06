// Pulls a few real headlines per category from public RSS feeds, server-side.
// Protected by the user's Supabase JWT (the Today page is behind login anyway).
const FEEDS = [
  { cat: "sports", url: "https://www.espn.com/espn/rss/news" },
  { cat: "music", url: "https://www.rollingstone.com/music/music-news/feed/" },
  { cat: "pop", url: "https://variety.com/feed/" },
];

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sbUrl = process.env.VITE_SUPABASE_URL, sbKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !sbUrl) { res.status(401).json({ error: "Please sign in again." }); return; }
    const who = await fetch(sbUrl + "/auth/v1/user", { headers: { Authorization: "Bearer " + token, apikey: sbKey } });
    if (!who.ok) { res.status(401).json({ error: "Session expired." }); return; }
  } catch { res.status(401).json({ error: "Auth failed." }); return; }

  const out = { sports: [], music: [], pop: [] };
  await Promise.all(FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": "LifeOS/1.0", Accept: "application/rss+xml,application/xml,text/xml,*/*" } });
      if (!r.ok) return;
      const xml = await r.text();
      out[f.cat] = parseRss(xml).slice(0, 5);
    } catch (e) {}
  }));
  res.status(200).json(out);
}

function parseRss(xml) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const b of blocks) {
    const body = b.split(/<\/item>/i)[0];
    const title = clean(pick(body, "title"));
    let link = clean(pick(body, "link"));
    if (!link) { const m = body.match(/<link[^>]*href=["']([^"']+)["']/i); if (m) link = m[1]; }
    if (title) items.push({ title, link });
  }
  return items;
}
function pick(body, tag) {
  const m = body.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return m ? m[1] : "";
}
function clean(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&#8217;/g, "’").replace(/&#8216;/g, "‘").replace(/&#8230;/g, "…").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .trim();
}
