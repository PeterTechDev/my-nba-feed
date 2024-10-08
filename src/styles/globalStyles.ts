// src/styles/globalStyles.ts
import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    /* Grayscale */
  --gray-100: #e1e1e6;
  --gray-300: #c4c4cc;
  --gray-400: #8d8d99;
  --gray-600: #323238;
  --gray-700: #29292e;
  --gray-800: #202024;
  --gray-900: #121214;

    /* Font sizes */
    --font-size-base: 1rem; /* 16px */
    --font-size-lg: 1.25rem; /* 20px */
    --font-size-sm: 0.875rem; /* 14px */

    /* Font family */
    --font-base: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;

    /* Container */
    --container-width: 736px;
  }

  /* Global Reset */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: var(--gray-900);
    color: var(--gray-300);
    font-family: var(--font-base);
    font-size: var(--font-size-base);
    line-height: 1.5;
    font-weight: 400;
    margin: 0;
    box-sizing: border-box;
  }

  /* Images */
  img {
    max-width: 100%;
    display: block;
  }

  /* Lists */
  ul,
  ol {
    list-style: none;
  }

  /* Buttons */
  button {
    background: none;
    border: none;
    cursor: pointer;
  }

  /* Links */
  a {
    text-decoration: inherit;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 500;
  }

  a:hover {
    color: ${({ theme }) => theme.colors.secondary};
    text-decoration: underline;
  }

  /* Container Utility */
  .container {
    width: 100%;
    max-width: var(--container-width);
    margin: 0 auto;
    padding: 0 1rem;
  }
`;
