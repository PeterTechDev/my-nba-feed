import axios from "axios";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

interface VideoSearchResponse {
  videoId: string;
  title: string;
  embedUrl: string;
}

/**
 * Function to search for videos on YouTube and return the embed URL, with caching.
 * @param query - The search term for the video.
 * @param teamId - The ID of the team to differentiate caches for different teams.
 * @returns A promise with video data including the embed URL.
 */
export async function fetchVideoEmbed(
  query: string,
  teamId: number
): Promise<VideoSearchResponse | null> {
  const today = new Date().toISOString().split("T")[0]; // Today's date
  const cacheKey = `lastGameHighlightVideo_${teamId}_${today}`; // Unique cache key per team and day

  // Check local storage for cached video data
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    const videoData = JSON.parse(cachedData);
    return videoData;
  }

  // Fetch data if no cache is found
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        q: `${query} `, // Include team name for a more specific query
        type: "video",
        maxResults: 1,
        key: API_KEY,
      },
    });

    const video = response.data.items[0];
    if (!video) return null;

    const videoId = video.id.videoId;
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const videoData = {
      videoId,
      title: video.snippet.title,
      embedUrl,
    };

    // Cache the video data with today's date
    localStorage.setItem(cacheKey, JSON.stringify(videoData));

    return videoData;
  } catch (error) {
    console.error("Error fetching video data:", error);
    return null;
  }
}
export async function fetchTop10Videos(): Promise<VideoSearchResponse[]> {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        q: "NBA Top 10 Plays of the Night",
        type: "video",
        maxResults: 10,
        key: API_KEY,
        order: "date",
      },
    });

    return response.data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
    }));
  } catch (error) {
    console.error("Error fetching Top 10 videos:", error);
    return [];
  }
}
