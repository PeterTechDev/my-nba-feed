import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainContent } from "./components/MainContent";
import { ThemeContextProvider } from "./context/ThemeProvider";
import { GlobalStyle } from "./styles/globalStyles";
import { ContentWrapper } from "./styles/ContentWrapper";
import { TeamProvider } from "./context/TeamContext/TeamProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeContextProvider initialTheme="celtics">
      <TeamProvider initialTeam="celtics">
        <GlobalStyle />
        <Header />
        <ContentWrapper>
          <Sidebar />
          <QueryClientProvider client={queryClient}>
            <MainContent />
          </QueryClientProvider>
        </ContentWrapper>
      </TeamProvider>
    </ThemeContextProvider>
  );
}

export default App;
