import { articles } from "../../../../mock-data/tab-content";
import { StyledArticlesTab, ArticleItem } from "./ArticlesTab.styles";

export const ArticlesTab = () => {
  return (
    <StyledArticlesTab>
      <h3>Latest Articles</h3>
      {articles.map((article) => (
        <ArticleItem key={article.id}>
          <h4>{article.title}</h4>
          <p>{article.content}</p>
        </ArticleItem>
      ))}
    </StyledArticlesTab>
  );
};
