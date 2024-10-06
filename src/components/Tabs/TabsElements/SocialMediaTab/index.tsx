import { socialMediaPosts } from "../../../../mock-data/tab-content";
import { StyledSocialMediaTab, PostContainer } from "./SocialMediaTab.styles";

export const SocialMediaTab = () => {
  return (
    <StyledSocialMediaTab>
      <h3>Social Media Feed</h3>
      {socialMediaPosts.map((post) => (
        <PostContainer key={post.id}>
          <p>{post.content}</p>
          <small>by {post.author}</small>
        </PostContainer>
      ))}
    </StyledSocialMediaTab>
  );
};
