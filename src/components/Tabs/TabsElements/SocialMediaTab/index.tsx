import { useTweets } from "../../../../services/twitterService";
import { Tweet } from "react-tweet"; // React Tweet for rendering
import {
  StyledSocialMediaTab,
  LoadingMessage,
  ErrorMessage,
} from "./SocialMediaTab.styles";
import { useTeam } from "../../../../context/TeamContext/useTeam";

export const SocialMediaTab = () => {
  const { teamTwitterHandle } = useTeam();
  const { data: tweetIds, isLoading, error } = useTweets(teamTwitterHandle);

  if (isLoading) return <LoadingMessage>Loading tweets...</LoadingMessage>;
  if (error)
    return <ErrorMessage>Error loading tweets: {error.message}</ErrorMessage>;

  return (
    <StyledSocialMediaTab>
      <h3>Latest Tweets from Celtics</h3>
      {tweetIds.map((id: string) => (
        <Tweet key={id} id={id} />
      ))}
    </StyledSocialMediaTab>
  );
};
