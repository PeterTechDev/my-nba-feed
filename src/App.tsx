import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { ThemeContextProvider } from "./context/ThemeProvider";
import { GlobalStyle } from "./styles/globalStyles";
import { ContentWrapper } from "./styles/ContentWrapper";

function App() {
  return (
    <ThemeContextProvider initialTheme="celtics">
      <GlobalStyle />
      <Header />
      <ContentWrapper>
        <Sidebar />
        <MainContent />
      </ContentWrapper>
    </ThemeContextProvider>
  );
}

export default App;
