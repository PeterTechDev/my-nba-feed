import axios from "axios";

// Define the base URL and API Key
const API_BASE_URL = "https://api.balldontlie.io/v1";
const API_KEY = import.meta.env.VITE_BALL_DONT_LIE_API_KEY;

// Axios instance with the base URL and API key
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: API_KEY,
  },
});

/**
 * Fetches the most recent game for a specific team within the current season.
 * @param teamId The ID of the NBA team
 * @returns The most recent game data for the team
 */
export const fetchLastGameData = async (teamId: number) => {
  try {
    // Define today's date and a start date for a recent timeframe
    const today = new Date().toISOString().split("T")[0];
    const startDate = new Date(new Date().setDate(new Date().getDate() - 3))
      .toISOString()
      .split("T")[0];
    // today - 2 days

    const response = await api.get("/games", {
      params: {
        team_ids: [teamId], // Filter by team ID
        per_page: 1, // Limit to 1 result to get the most recent
        start_date: startDate,
        end_date: today,
      },
    });
    console.log(response.data.data[0]);
    return response.data.data[0]; // Return the most recent game data
  } catch (error) {
    throw new Error(`Failed to fetch last game data: ${error.message}`);
  }
};

export async function fetchNextGameData(teamId: number) {
  try {
    const response = await api.get(`/games`, {
      params: {
        team_ids: [teamId],
        start_date: new Date().toISOString().split("T")[0], // Today's date
        per_page: 1,
      },
    });

    const nextGame = response.data.data[0]; // Get the first upcoming game
    console.log(nextGame);
    return nextGame;
  } catch (error) {
    console.error("Error fetching next game data:", error);
    return null;
  }
}
