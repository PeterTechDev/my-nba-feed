import { Header } from "./components/Header";
import { MainContent } from "./components/MainContent";
import { Sidebar } from "./components/Sidebar";
import { ContentWrapper } from "./styles/ContentWrapper";
import { ThemeProviderWrapper } from "./styles/ThemeProviderWrapper";
import { GlobalStyle } from "./styles/globalStyles";

function App() {
  return (
    <ThemeProviderWrapper initialTheme="celtics">
      <GlobalStyle />
      <Header />
      <ContentWrapper>
        <Sidebar />
        <MainContent />
      </ContentWrapper>
      {/* Other components will be added here */}
    </ThemeProviderWrapper>
  );
}

export default App;
