import { pathToFileURL } from "node:url";
import { teams } from "../src/lib/teams.ts";
import { NBA_CHANNEL_ID, highlightMatch, topPlayMatch, highlightKey, parseHighlightPublication } from "../src/lib/youtubeHighlights.ts";

export const endpoint = "https://my-nba-feed.vercel.app/api/highlights";

export async function syncYouTubeHighlights({ apiKey, publishToken, now = new Date(), fetcher = fetch }) {
  if (!apiKey?.trim()) throw new Error("YOUTUBE_API_KEY is required");
  if (!publishToken?.trim()) throw new Error("DIGEST_PUBLISH_TOKEN is required");
  let apiRequests = 0;
  const json = async (url, label, options = {}) => {
    const response = await fetcher(url, { ...options, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${label} failed (HTTP ${response.status})`);
    return response.json();
  };
  const read = () => json(`${endpoint}?sync=1`, "Highlights read", { headers: { Authorization: `Bearer ${publishToken}` } });
  const existing = await read();
  if (!Array.isArray(existing.videos) || existing.syncedAt !== null && !Number.isFinite(Date.parse(existing.syncedAt))) throw new Error("Invalid saved highlights");
  if (existing.syncedAt && now.getTime() - Date.parse(existing.syncedAt) < 30 * 60000) return { status: "already-synced", apiRequests: 0, added: 0 };

  const youtube = async (resource, params) => {
    apiRequests++;
    return json(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`, "YouTube API", { headers: { "x-goog-api-key": apiKey } });
  };
  const channels = await youtube("channels", { part: "contentDetails", id: NBA_CHANNEL_ID });
  const channel = channels.items?.find((item) => item.id === NBA_CHANNEL_ID);
  const playlistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (typeof playlistId !== "string" || !/^[\w-]{10,100}$/.test(playlistId)) throw new Error("NBA uploads playlist unavailable");
  const oldestGame = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const publishedSince = !existing.topPlaysEnabled ? now.getTime() - 30 * 86400000 : Math.max(now.getTime() - 30 * 86400000, existing.syncedAt ? Date.parse(existing.syncedAt) - 48 * 3600000 : 0);
  const savedGames = new Set(existing.videos.map(highlightKey));
  const candidates = new Map();
  const pages = new Set();
  let pageToken = "", finished = false;
  for (let page = 0; page < 100; page++) {
    const batch = await youtube("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    if (!Array.isArray(batch.items)) throw new Error("Invalid NBA uploads response");
    let reachedOldUploads = false;
    for (const item of batch.items) {
      const published = Date.parse(item.contentDetails?.videoPublishedAt);
      if (!Number.isFinite(published)) continue;
      if (published < publishedSince) { reachedOldUploads = true; continue; }
      const title = item.snippet?.title;
      const game = typeof title === "string" ? (topPlayMatch(title) ?? highlightMatch(title, teams)) : null;
      const id = item.contentDetails?.videoId;
      if (!game || !/^[\w-]{11}$/.test(id ?? "") || game.date < oldestGame || game.date > now.toISOString().slice(0, 10)) continue;
      const key = highlightKey(game);
      if (savedGames.has(key)) continue;
      const previous = candidates.get(key);
      // Prefer the standard recap when the channel also uploads an extended version.
      if (!previous || /^EXTENDED:/i.test(previous.title) && !/^EXTENDED:/i.test(title)) candidates.set(key, { id, title, ...game });
    }
    if (reachedOldUploads || !batch.nextPageToken) { finished = true; break; }
    if (typeof batch.nextPageToken !== "string" || pages.has(batch.nextPageToken)) throw new Error("Invalid uploads pagination");
    pages.add(batch.nextPageToken); pageToken = batch.nextPageToken;
  }
  if (!finished) throw new Error("Uploads exceeded the bounded scan; saved highlights were preserved");

  const selected = [...candidates.values()];
  const videos = [];
  for (let offset = 0; offset < selected.length; offset += 50) {
    const requested = selected.slice(offset, offset + 50);
    const batch = await youtube("videos", { part: "snippet,contentDetails,status", id: requested.map((video) => video.id).join(",") });
    if (!Array.isArray(batch.items)) throw new Error("Invalid YouTube videos response");
    for (const video of batch.items) {
      const candidate = requested.find((item) => item.id === video.id);
      if (!candidate || video.snippet?.channelId !== NBA_CHANNEL_ID || video.status?.embeddable !== true || video.status?.privacyStatus !== "public") continue;
      const game = topPlayMatch(video.snippet.title) ?? highlightMatch(video.snippet.title, teams);
      if (!game || highlightKey(game) !== highlightKey(candidate)) continue;
      const duration = video.contentDetails?.duration?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
      if (!duration) continue;
      const thumbnails = video.snippet.thumbnails;
      videos.push({ id: video.id, ...game, title: video.snippet.title,
        thumbnail: (thumbnails?.maxres ?? thumbnails?.standard ?? thumbnails?.high ?? thumbnails?.medium)?.url,
        duration: Number(duration[1] ?? 0) * 3600 + Number(duration[2] ?? 0) * 60 + Number(duration[3] ?? 0), retrievedAt: now.toISOString() });
    }
  }
  const publication = parseHighlightPublication({ syncedAt: now.toISOString(), topPlaysEnabled: true, videos }, teams, now);
  const saved = await json(endpoint, "Highlights publication", {
    method: "POST", headers: { Authorization: `Bearer ${publishToken}`, "Content-Type": "application/json" }, body: JSON.stringify(publication),
  });
  if (!saved.success) throw new Error("Highlights publication was not acknowledged");
  const confirmed = await read();
  if (confirmed.syncedAt !== publication.syncedAt || !publication.videos.every((video) => confirmed.videos?.some((entry) => entry.id === video.id))) throw new Error("Highlights persistence was not confirmed");
  return { status: "synced", apiRequests, added: publication.videos.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await syncYouTubeHighlights({ apiKey: process.env.YOUTUBE_API_KEY, publishToken: process.env.DIGEST_PUBLISH_TOKEN })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
