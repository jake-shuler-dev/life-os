// Sonos Control API proxy.
// GET ?code=...  -> OAuth callback: exchanges the code for tokens, hands the
//                   refresh token back to the app via postMessage, closes popup.
// POST {action}  -> refreshes an access token from the stored refresh token and
//                   runs a control command. Protected by the user's Supabase JWT.

const TOKEN_URL = "https://api.sonos.com/login/v3/oauth/access";
const CONTROL = "https://api.ws.sonos.com/control/api/v1";

export default async function handler(req, res) {
  const KEY = process.env.VITE_SONOS_KEY;
  const SECRET = process.env.SONOS_SECRET;
  const basic = () => "Basic " + Buffer.from(KEY + ":" + SECRET).toString("base64");

  // ---- OAuth callback (popup redirect from Sonos) ----
  if (req.method === "GET" && req.query && req.query.code) {
    if (!KEY || !SECRET) { sendHtml(res, "Sonos isn't configured on the server yet."); return; }
    try {
      const proto = req.headers["x-forwarded-proto"] || "https";
      const redirectUri = proto + "://" + req.headers.host + "/api/sonos";
      const body = new URLSearchParams({ grant_type: "authorization_code", code: String(req.query.code), redirect_uri: redirectUri });
      const r = await fetch(TOKEN_URL, { method: "POST", headers: { Authorization: basic(), "Content-Type": "application/x-www-form-urlencoded" }, body });
      const tok = await r.json();
      if (!r.ok || !tok.refresh_token) { sendHtml(res, "Sonos authorization failed. Close this window and try again."); return; }
      sendHtml(res, "Connected to Sonos. You can close this window.", tok.refresh_token);
    } catch (e) { sendHtml(res, "Something went wrong talking to Sonos. Close this window and try again."); }
    return;
  }

  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  // ---- verify the signed-in user ----
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const sbUrl = process.env.VITE_SUPABASE_URL, sbKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !sbUrl) { res.status(401).json({ error: "Please sign in again." }); return; }
    const who = await fetch(sbUrl + "/auth/v1/user", { headers: { Authorization: "Bearer " + token, apikey: sbKey } });
    if (!who.ok) { res.status(401).json({ error: "Your session expired — sign in again." }); return; }
  } catch { res.status(401).json({ error: "Could not verify your session." }); return; }

  const { action, refresh_token, groupId, volume } = req.body || {};
  if (!KEY || !SECRET) { res.status(500).json({ error: "Sonos isn't configured on the server yet." }); return; }
  if (!refresh_token) { res.status(400).json({ error: "Not connected to Sonos." }); return; }

  // ---- refresh an access token ----
  let access;
  try {
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token });
    const r = await fetch(TOKEN_URL, { method: "POST", headers: { Authorization: basic(), "Content-Type": "application/x-www-form-urlencoded" }, body });
    const tok = await r.json();
    if (!r.ok || !tok.access_token) { res.status(401).json({ error: "Sonos connection expired — reconnect." }); return; }
    access = tok.access_token;
  } catch { res.status(502).json({ error: "Couldn't reach Sonos." }); return; }

  const H = { Authorization: "Bearer " + access, "Content-Type": "application/json" };
  const api = (path, opts = {}) => fetch(CONTROL + path, { headers: H, ...opts });

  try {
    if (action === "state") {
      const hh = await (await api("/households")).json();
      const householdId = hh.households && hh.households[0] && hh.households[0].id;
      if (!householdId) { res.status(200).json({ groups: [], error: "No Sonos system found on this account." }); return; }
      const gd = await (await api("/households/" + householdId + "/groups")).json();
      const groups = (gd.groups || []).map((g) => ({ id: g.id, name: g.name }));
      const gid = groupId || (groups[0] && groups[0].id);
      let nowPlaying = null, playing = false, vol = null;
      if (gid) {
        const md = await (await api("/groups/" + gid + "/playbackMetadata")).json();
        const track = md.currentItem && md.currentItem.track;
        if (track) nowPlaying = { title: track.name, artist: track.artist && track.artist.name, art: track.imageUrl };
        const pd = await (await api("/groups/" + gid + "/playback")).json();
        playing = pd.playbackState === "PLAYBACK_STATE_PLAYING";
        const vd = await (await api("/groups/" + gid + "/groupVolume")).json();
        vol = typeof vd.volume === "number" ? vd.volume : null;
      }
      res.status(200).json({ groups, groupId: gid, nowPlaying, playing, volume: vol });
      return;
    }
    if (!groupId) { res.status(400).json({ error: "No room selected." }); return; }
    if (action === "play") await api("/groups/" + groupId + "/playback/play", { method: "POST" });
    else if (action === "pause") await api("/groups/" + groupId + "/playback/pause", { method: "POST" });
    else if (action === "next") await api("/groups/" + groupId + "/playback/skipToNextTrack", { method: "POST" });
    else if (action === "prev") await api("/groups/" + groupId + "/playback/skipToPreviousTrack", { method: "POST" });
    else if (action === "volume") await api("/groups/" + groupId + "/groupVolume", { method: "POST", body: JSON.stringify({ volume: Math.max(0, Math.min(100, volume | 0)) }) });
    else { res.status(400).json({ error: "Unknown action." }); return; }
    res.status(200).json({ ok: true });
  } catch (e) { res.status(502).json({ error: "Sonos command failed." }); }
}

function sendHtml(res, msg, refreshToken) {
  const post = refreshToken
    ? '<script>try{window.opener&&window.opener.postMessage({type:"sonos-auth",refresh_token:' + JSON.stringify(refreshToken) + '},"*");}catch(e){}setTimeout(function(){window.close();},900);</script>'
    : "";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = 200;
  res.end('<!doctype html><meta charset="utf-8"><body style="background:#0E0E10;color:#F1EFEA;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px">' + msg + post + "</body>");
}
