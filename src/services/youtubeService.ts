// src/services/youtubeService.ts

import axios from "axios";

const API_KEY = "AIzaSyD70a-GCHov2z7jSC2t8ivF0_drRNVbv84"; // Replace with your actual API key
const BASE_URL = "https://www.googleapis.com/youtube/v3";

interface VideoSearchResponse {
  videoId: string;
  title: string;
  embedUrl: string;
}

/**
 * Function to search for videos on YouTube and return the embed URL.
 * @param query - The search term for the video.
 * @returns A promise with video data including the embed URL.
 */
export async function fetchVideoEmbed(
  query: string
): Promise<VideoSearchResponse | null> {
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

    return {
      videoId,
      title: video.snippet.title,
      embedUrl,
    };
  } catch (error) {
    console.error("Error fetching video data:", error);
    return null;
  }
}
