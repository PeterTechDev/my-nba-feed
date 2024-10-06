import { lastGame } from "../../../../mock-data/tab-content";
import {
  StyledLastGameTab,
  StatsContainer,
  HighlightVideo,
  VideoEmbed,
} from "./LastGameTab.styles";

export const LastGameTab = () => {
  return (
    <StyledLastGameTab>
      <h3>Last Game vs. {lastGame.opponent}</h3>
      <p>Date: {lastGame.date}</p>

      {/* Game Stats */}
      <StatsContainer>
        <div>
          <strong>Final Score:</strong> {lastGame.stats.teamPoints} -{" "}
          {lastGame.stats.opponentPoints}
        </div>
        <div>
          <strong>Top Scorer:</strong> {lastGame.stats.topScorer.name} (
          {lastGame.stats.topScorer.points} points)
        </div>
      </StatsContainer>

      {/* Highlights Videos */}
      <h4>Highlights</h4>
      <ul>
        {lastGame.highlights.map((video) => (
          <HighlightVideo key={video.id}>
            <VideoEmbed
              src={`https://www.youtube.com/embed/${getYoutubeVideoId(
                video.url
              )}`}
              title={video.title}
              allowFullScreen
            />
          </HighlightVideo>
        ))}
      </ul>
    </StyledLastGameTab>
  );
};

// Helper function to extract video ID from YouTube URL
function getYoutubeVideoId(url: string) {
  const urlObj = new URL(url);
  return urlObj.searchParams.get("v");
}
