import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ThemeProviderWrapper } from "./styles/ThemeProviderWrapper";
import { GlobalStyle } from "./styles/globalStyles";

function App() {
  return (
    <ThemeProviderWrapper initialTheme="celtics">
      <GlobalStyle />
      <Header />
      <Sidebar />
      {/* Other components will be added here */}
    </ThemeProviderWrapper>
  );
}

export default App;
