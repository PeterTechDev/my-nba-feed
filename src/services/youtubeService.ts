import axios from "axios";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

interface VideoSearchResponse {
  videoId: string;
  title: string;
  embedUrl: string;
}

const VIDEO_CACHE_KEY = "lastGameHighlightVideo";

/**
 * Function to search for videos on YouTube and return the embed URL, with caching.
 * @param query - The search term for the video.
 * @returns A promise with video data including the embed URL.
 */
export async function fetchVideoEmbed(
  query: string
): Promise<VideoSearchResponse | null> {
  const today = new Date().toISOString().split("T")[0]; // Get the current date in YYYY-MM-DD format

  // Check local storage for cached video data
  const cachedData = localStorage.getItem(VIDEO_CACHE_KEY);
  if (cachedData) {
    const { date, videoData } = JSON.parse(cachedData);

    // If the cached data is from today, use it instead of making an API call
    if (date === today) {
      return videoData;
    }
  }

  // If no cached data is found or data is outdated, make a new API request
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: "snippet",
        q: query,
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
    localStorage.setItem(
      VIDEO_CACHE_KEY,
      JSON.stringify({ date: today, videoData })
    );

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
