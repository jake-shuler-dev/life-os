// Pulls real headlines per category from public RSS feeds, server-side.
// Protected by the user's Supabase JWT (the app is behind login anyway).
const FEEDS = [
  { cat: "sports", source: "ESPN", url: "https://www.espn.com/espn/rss/news" },
  { cat: "pop", source: "Variety", url: "https://variety.com/feed/" },
  { cat: "pop", source: "Rolling Stone", url: "https://www.rollingstone.com/culture/culture-news/feed/" },
  { cat: "economics", source: "CNBC", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html" },
  { cat: "economics", source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { cat: "politics", source: "NPR", url: "https://feeds.npr.org/1014/rss.xml" },
  { cat: "politics", source: "The Hill", url: "https://thehill.com/news/feed/" },
  { cat: "local", source: "Tennessean", url: "https://rssfeeds.tennessean.com/nashville/news" },
  { cat: "local", source: "WKRN", url: "https://www.wkrn.com/feed/" },
];
const CATS = ["sports", "pop", "economics", "politics", "local"];

export default async function handler(req, res) {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sbUrl = process.env.VITE_SUPABASE_URL, sbKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !sbUrl) { res.status(401).json({ error: "Please sign in again." }); return; }
    const who = await fetch(sbUrl + "/auth/v1/user", { headers: { Authorization: "Bearer " + token, apikey: sbKey } });
    if (!who.ok) { res.status(401).json({ error: "Session expired." }); return; }
  } catch { res.status(401).json({ error: "Auth failed." }); return; }

  const out = {}; CATS.forEach((c) => (out[c] = []));
  await Promise.all(FEEDS.map(async (f) => {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (LifeOS)", Accept: "application/rss+xml,application/xml,text/xml,*/*" } });
      if (!r.ok) return;
      const xml = await r.text();
      const items = parseRss(xml).slice(0, 6).map((it) => ({ ...it, source: f.source }));
      out[f.cat].push(...items);
    } catch (e) {}
  }));
  for (const c of CATS) {
    const seen = new Set();
    out[c] = out[c].filter((x) => { const k = (x.title || "").toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
  }
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
