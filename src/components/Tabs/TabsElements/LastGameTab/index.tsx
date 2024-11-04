import { useEffect, useState } from "react";
import { fetchLastGameData } from "../../../../services/nbaService";
import { fetchVideoEmbed } from "../../../../services/youtubeService";
import { LastGameSkeleton } from "./LastGameSkeleton";
import {
  RecapContainer,
  StyledLastGameTab,
  VideoEmbedContainer,
} from "./LastGameTab.styles";

export const LastGameTab = () => {
  const [lastGameData, setLastGameData] = useState<any | null>(null);
  const [videoData, setVideoData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const teamId = 2; // Celtics team ID

  useEffect(() => {
    const getGameData = async () => {
      try {
        const lastGame = await fetchLastGameData(teamId);
        setLastGameData(lastGame);
        setLoading(false);

        // Fetch YouTube video after last game data is set
        if (lastGame) {
          const query = `${lastGame.home_team.full_name} vs. ${lastGame.visitor_team.full_name} highlights`;
          const video = await fetchVideoEmbed(query);
          setVideoData(video);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    getGameData();
  }, []);

  if (loading) return <LastGameSkeleton />;
  if (error) return <div>Error loading data: {error}</div>;

  // Function to generate a simple game recap // Think a a better way to generate the recap
  const generateRecap = () => {
    if (!lastGameData) return "";
    const homeScore = lastGameData.home_team_score;
    const visitorScore = lastGameData.visitor_team_score;
    const winningTeam =
      homeScore > visitorScore
        ? lastGameData.home_team.full_name
        : lastGameData.visitor_team.full_name;
    const losingTeam =
      homeScore > visitorScore
        ? lastGameData.visitor_team.full_name
        : lastGameData.home_team.full_name;
    const scoreDifference = Math.abs(homeScore - visitorScore);

    return `${winningTeam} defeated ${losingTeam} by ${scoreDifference} points in a thrilling matchup.`;
  };

  return (
    <StyledLastGameTab>
      {/* Last Game Section */}
      {lastGameData && (
        <>
          <h3>
            {lastGameData.home_team.full_name} vs.{" "}
            {lastGameData.visitor_team.full_name}
          </h3>
          <p>
            {new Date(lastGameData.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p>
            {lastGameData.home_team.full_name} {lastGameData.home_team_score} -{" "}
            {lastGameData.visitor_team.full_name}{" "}
            {lastGameData.visitor_team_score}
          </p>
        </>
      )}

      {/* Game Recap */}
      <RecapContainer>
        <h4>Game Recap</h4>
        <p>{generateRecap()}</p>
      </RecapContainer>

      {/* Highlight Video Section */}
      {videoData && (
        <VideoEmbedContainer>
          <h4>Highlights</h4>
          <iframe
            title={videoData.title}
            src={videoData.embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </VideoEmbedContainer>
      )}
    </StyledLastGameTab>
  );
};
