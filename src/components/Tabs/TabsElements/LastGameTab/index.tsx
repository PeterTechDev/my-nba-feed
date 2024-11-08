import { useEffect, useState } from "react";
import { fetchLastGameData } from "../../../../services/nbaService";
import { fetchVideoEmbed } from "../../../../services/youtubeService";
import { LastGameSkeleton } from "./LastGameSkeleton";
import {
  StyledLastGameTab,
  VideoEmbedContainer,
  ToggleButton,
} from "./LastGameTab.styles";
import { formatDate } from "../../../../utils/formatDate";

interface LastGameTabProps {
  teamId: number;
}

export const LastGameTab = ({ teamId }: LastGameTabProps) => {
  const [lastGameData, setLastGameData] = useState<any | null>(null);
  const [videoData, setVideoData] = useState<any | null>(null);
  const [showResult, setShowResult] = useState(false); // State to toggle result visibility
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getGameData = async () => {
      try {
        const lastGame = await fetchLastGameData(teamId);
        setLastGameData(lastGame);
        setLoading(false);

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
  }, [teamId]);

  if (loading) return <LastGameSkeleton />;
  if (error) return <div>Error loading data: {error}</div>;

  return (
    <StyledLastGameTab>
      {lastGameData && (
        <>
          <h3>
            {lastGameData.home_team.full_name} vs.{" "}
            {lastGameData.visitor_team.full_name}
          </h3>
          <p>{formatDate(lastGameData.date)}</p>

          {/* Toggle Button for Game Result */}
          <ToggleButton onClick={() => setShowResult(!showResult)}>
            {showResult ? "Hide Result" : "Show Result"}
          </ToggleButton>

          {showResult && (
            <p>
              {lastGameData.home_team.full_name} {lastGameData.home_team_score}{" "}
              - {lastGameData.visitor_team.full_name}{" "}
              {lastGameData.visitor_team_score}
            </p>
          )}
        </>
      )}

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
