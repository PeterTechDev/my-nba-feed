import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const BACKEND_API_URL = "https://my-nba-feed-backend.onrender.com";

export const fetchTweetIds = async (username: string) => {
  console.log("fetching tweets for", username);
  const response = await axios.get(`${BACKEND_API_URL}/api/tweets/${username}`);
  return response.data; // Return array of tweet IDs
};

console.log("fetchTweetIds", fetchTweetIds);

// Hook to use tweets and cache them for 5 minutes
export const useTweets = (username: string) => {
  return useQuery({
    queryKey: ["tweets", username],
    queryFn: () => fetchTweetIds(username),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
