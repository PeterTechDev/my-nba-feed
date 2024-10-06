import { useTabs, TabNames } from "../TabsContext";
import {
  socialMediaPosts,
  standings,
  top10Videos,
  articles,
} from "../../../mock-data/tab-content";
import { StyledTabContent } from "../styles/Tabs.styles";

export const TabContent = () => {
  const { activeTab } = useTabs();

  const renderContent = () => {
    switch (activeTab) {
      case TabNames.SOCIAL:
        return (
          <div>
            <h3>Social Media Feed</h3>
            {socialMediaPosts.map((post) => (
              <div key={post.id}>
                <p>{post.content}</p>
                <small>by {post.author}</small>
              </div>
            ))}
          </div>
        );
      case TabNames.STANDINGS:
        return (
          <div>
            <h3>Standings</h3>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Wins</th>
                  <th>Losses</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team) => (
                  <tr key={team.team}>
                    <td>{team.team}</td>
                    <td>{team.wins}</td>
                    <td>{team.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case TabNames.TOP_10:
        return (
          <div>
            <h3>Top 10 Videos</h3>
            <ul>
              {top10Videos.map((video) => (
                <li key={video.id}>
                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                    {video.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        );
      case TabNames.ARTICLES:
        return (
          <div>
            <h3>Articles</h3>
            {articles.map((article) => (
              <div key={article.id}>
                <h4>{article.title}</h4>
                <p>{article.content}</p>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return <StyledTabContent>{renderContent()}</StyledTabContent>;
};
