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
  sixers: {
    colors: {
      primary: "#006BB6",
      secondary: "#ED174C",
      background: "#ffffff",
      text: "#000000",
    },
  },
  warriors: {
    colors: {
      primary: "#1D428A",
      secondary: "#FFC72C",
      background: "#ffffff",
      text: "#000000",
    },
  },
  bulls: {
    colors: {
      primary: "#CE1141",
      secondary: "#000000",
      background: "#ffffff",
      text: "#000000",
    },
  },
};

export type ThemeNames = keyof typeof themes;
