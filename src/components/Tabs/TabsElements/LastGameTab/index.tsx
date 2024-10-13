import { useState, useEffect } from "react";
import { fetchAllTeams } from "../../../../services/nbaService";
import { StyledLastGameTab } from "./LastGameTab.styles";

export const LastGameTab = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getTeams = async () => {
      try {
        const allTeams = await fetchAllTeams();
        setTeams(allTeams);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    getTeams();
  }, []);

  // Render loading, error, or teams data
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading teams: {error.message}</div>;

  return (
    <StyledLastGameTab>
      <h3>NBA Teams</h3>
      <ul>
        {teams.map((team) => (
          <li key={team.id}>
            {team.full_name} ({team.abbreviation})
          </li>
        ))}
      </ul>
    </StyledLastGameTab>
  );
};
