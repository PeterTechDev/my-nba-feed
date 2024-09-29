import { Header } from "./components/Header";
import { ThemeProviderWrapper } from "./styles/ThemeProviderWrapper";
import { GlobalStyle } from "./styles/globalStyles";

function App() {
  return (
    <ThemeProviderWrapper initialTheme="celtics">
      <GlobalStyle />
      <Header />
      {/* Future components */}
    </ThemeProviderWrapper>
  );
}

export default App;
