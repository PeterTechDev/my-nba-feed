export const themes = {
  celtics: {
    colors: {
      primary: "#007A33",
      secondary: "#BA9653",
      background: "#ffffff",
      text: "#000000",
    },
  },
  lakers: {
    colors: {
      primary: "#552583",
      secondary: "#FDB927",
      background: "#ffffff",
      text: "#000000",
    },
  },
  // New themes can be added here in the future
};

export type ThemeNames = keyof typeof themes;
