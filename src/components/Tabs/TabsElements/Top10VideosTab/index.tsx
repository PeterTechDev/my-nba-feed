import { top10Videos } from "../../../../mock-data/tab-content";
import { StyledTop10VideosTab, VideoItem } from "./Top10VideosTab.styles";

export const Top10VideosTab = () => {
  return (
    <StyledTop10VideosTab>
      <h3>Top 10 Videos</h3>
      <ul>
        {top10Videos.map((video) => (
          <VideoItem key={video.id}>
            <a href={video.url} target="_blank" rel="noopener noreferrer">
              {video.title}
            </a>
          </VideoItem>
        ))}
      </ul>
    </StyledTop10VideosTab>
  );
};
