// Fetches an iCal/.ics URL server-side (avoids browser CORS), parses VEVENTs,
// expands common recurrences within a window, and returns simple events.
// Works for Google Calendar "secret iCal address", Apple iCloud, Outlook, etc.

const DAY = 86400000;
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sbUrl = process.env.VITE_SUPABASE_URL, sbKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !sbUrl || !sbKey) { res.status(401).json({ error: "Please sign in again." }); return; }
    const who = await fetch(`${sbUrl}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: sbKey } });
    if (!who.ok) { res.status(401).json({ error: "Your session expired — sign in again." }); return; }
  } catch { res.status(401).json({ error: "Could not verify your session." }); return; }

  let { url } = req.body || {};
  if (!url || typeof url !== "string") { res.status(400).json({ error: "Provide a calendar URL." }); return; }
  url = url.trim().replace(/^webcal:\/\//i, "https://");
  if (!/^https?:\/\//i.test(url)) { res.status(400).json({ error: "That doesn't look like a valid URL." }); return; }

  try {
    const r = await fetch(url, { headers: { "User-Agent": "LifeOS-Calendar/1.0", "Accept": "text/calendar,*/*" } });
    if (!r.ok) { res.status(502).json({ error: "Couldn't fetch the calendar (" + r.status + "). Check the URL is the iCal/.ics address." }); return; }
    const text = await r.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) { res.status(422).json({ error: "That URL didn't return a calendar feed. Use the iCal/.ics URL, not the share page." }); return; }
    res.status(200).json({ events: parseICS(text) });
  } catch (e) { res.status(502).json({ error: "Error reading that calendar feed." }); }
}

function parseICS(raw) {
  const text = raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); // unfold
  const now = Date.now(), winStart = now - 31 * DAY, winEnd = now + 160 * DAY;
  const out = [];
  const blocks = text.split("BEGIN:VEVENT").slice(1);
  for (const b of blocks) {
    const body = b.split("END:VEVENT")[0];
    const get = (name) => { const m = body.match(new RegExp("\\n" + name + "([^\\n]*)", "i")); return m ? m[1] : null; };
    const summaryRaw = get("SUMMARY");
    if (summaryRaw == null) continue;
    const title = summaryRaw.replace(/^[^:]*:/, "").replace(/\\,/g, ",").replace(/\\n/gi, " ").trim() || "(untitled)";
    const dtRaw = get("DTSTART");
    if (!dtRaw) continue;
    const dt = parseDt(dtRaw);
    if (!dt) continue;
    const rruleRaw = get("RRULE");
    const occ = [];
    if (rruleRaw) expand(rruleRaw.replace(/^[^:]*:/, "").trim(), dt, winStart, winEnd, occ);
    else if (dt.ms >= winStart && dt.ms <= winEnd) occ.push(dt.ms);
    for (const ms of occ) out.push({ title, allDay: dt.allDay, date: dateKey(ms), time: fmtTime(ms, dt.allDay) });
    if (out.length > 1200) break;
  }
  return out;
}

function parseDt(raw) {
  const isDate = /VALUE=DATE(?![-A-Z])/i.test(raw) || /:\d{8}$/.test(raw);
  const m = raw.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!m) return null;
  return { ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)), allDay: isDate };
}
function dateKey(ms) { const d = new Date(ms); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
function fmtTime(ms, allDay) { if (allDay) return "All day"; const d = new Date(ms); let h = d.getUTCHours(); const mi = d.getUTCMinutes(); const ap = h >= 12 ? "p" : "a"; h = h % 12 || 12; return h + (mi ? ":" + String(mi).padStart(2, "0") : ":00") + ap; }

function expand(rrule, dt, winStart, winEnd, out) {
  const parts = {}; rrule.split(";").forEach((p) => { const [k, v] = p.split("="); if (k) parts[k.toUpperCase()] = v; });
  const freq = parts.FREQ, interval = Math.max(1, +parts.INTERVAL || 1);
  const count = parts.COUNT ? +parts.COUNT : null;
  let until = null; if (parts.UNTIL) { const d = parseDt(parts.UNTIL); until = d ? d.ms : null; }
  const cap = 500; let n = 0;
  const push = (ms) => { if (ms >= winStart && ms <= winEnd) out.push(ms); };
  const limitOk = () => (count == null || n < count) && out.length < 1100;

  if (freq === "WEEKLY") {
    const days = (parts.BYDAY ? parts.BYDAY.split(",").map((x) => WD[x.slice(-2)]).filter((x) => x != null) : [new Date(dt.ms).getUTCDay()]).sort();
    const tod = dt.ms - Date.UTC(new Date(dt.ms).getUTCFullYear(), new Date(dt.ms).getUTCMonth(), new Date(dt.ms).getUTCDate());
    let weekStart = dt.ms - new Date(dt.ms).getUTCDay() * DAY - tod; // Sunday 00:00 UTC of start week
    for (let w = 0; w < cap; w++) {
      const base = weekStart + w * interval * 7 * DAY;
      if (base > winEnd) break;
      for (const wd of days) {
        const occ = base + wd * DAY + tod;
        if (occ < dt.ms) continue;
        if (until && occ > until) return;
        if (!limitOk()) return;
        push(occ); n++;
      }
    }
  } else if (freq === "MONTHLY") {
    const d0 = new Date(dt.ms), y = d0.getUTCFullYear(), mo = d0.getUTCMonth(), day = d0.getUTCDate(), h = d0.getUTCHours(), mi = d0.getUTCMinutes();
    for (let i = 0; i < cap; i++) {
      const occ = Date.UTC(y, mo + i * interval, day, h, mi);
      if (occ > winEnd) break;
      if (until && occ > until) break;
      if (!limitOk()) break;
      push(occ); n++;
    }
  } else { // DAILY (and fallback)
    const step = (freq === "YEARLY" ? 365 : 1) * interval * DAY;
    for (let i = 0, t = dt.ms; i < 1500; i++, t += step) {
      if (t > winEnd) break;
      if (until && t > until) break;
      if (!limitOk()) break;
      push(t); n++;
    }
  }
}
