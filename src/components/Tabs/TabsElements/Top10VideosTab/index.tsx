import { useEffect, useState } from "react";
import { fetchTop10Videos } from "../../../../services/youtubeService";
import { StyledTop10VideosTab, VideoItem } from "./Top10VideosTab.styles";

export const Top10VideosTab = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTop10Videos = async () => {
      const videoData = await fetchTop10Videos();
      setVideos(videoData);
      setLoading(false);
    };

    getTop10Videos();
  }, []);

  return (
    <StyledTop10VideosTab>
      <h3>Top 10 Videos</h3>
      {loading ? (
        <p>Loading videos...</p>
      ) : (
        <ul>
          {videos.map((video) => (
            <VideoItem key={video.videoId}>
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {video.title}
              </a>
            </VideoItem>
          ))}
        </ul>
      )}
    </StyledTop10VideosTab>
  );
};
