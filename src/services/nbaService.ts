import axios from "axios";

// Define the base URL for the BallDontLie API
const API_BASE_URL = "https://api.balldontlie.io/v1";

// Your API Key from BallDontLie
const API_KEY = "c04b207f-6633-4e17-8455-34180e22da52";

// Function to fetch all teams
export const fetchAllTeams = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teams`, {
      headers: {
        Authorization: API_KEY, // Include your API key in the header
      },
    });

    return response.data.data; // Return all teams data
  } catch (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }
};
