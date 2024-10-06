import styled, { keyframes } from "styled-components";

// Keyframes for blinking effect
const blink = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
`;

// Container for the whole tabs component
export const TabsContainer = styled.div`
  width: 100%;
  margin-top: 1rem;
  position: relative; /* Enable absolute positioning for children */
  overflow: hidden; /* Hide overflow to ensure scroll buttons appear correctly */
  background: var(--gray-800);
  display: flex;
  align-items: center;
`;

// Styling for the tab menu
export const StyledTabMenu = styled.ul`
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  border-bottom: 2px solid var(--gray-600);
  overflow-x: auto;
  white-space: nowrap;
  max-width: 90vw;
  flex: 1; /* Allow the tab menu to take all available space */

  &::-webkit-scrollbar {
    display: none;
  }
`;

// Styling for the scroll button with blinking animation
export const StyledScrollButton = styled.button`
  background: transparent;
  border: none;
  position: absolute;
  top: 80%;
  transform: translateY(-50%);
  cursor: pointer;
  z-index: 2; /* Make sure the button is above other elements */
  padding: 0.5rem;
  color: ${({ theme }) => theme.colors.primary};

  animation: ${blink} 0.8s ease-in-out 3; /* Blink animation */
  animation-fill-mode: forwards; /* Keep the button invisible after animation */

  &:disabled {
    color: var(--gray-400);
    cursor: not-allowed;
  }

  /* Specific styles for left and right buttons */
  &.left {
    left: 0;
  }

  &.right {
    right: 0;
  }
`;

// Individual tab item styles remain the same
export const StyledTabItem = styled.li<{ isActive: boolean }>`
  padding: 1rem 1.5rem;
  cursor: pointer;
  font-weight: bold;
  border-bottom: 4px solid
    ${({ isActive, theme }) =>
      isActive ? theme.colors.primary : "transparent"};
  color: ${({ isActive }) =>
    isActive ? "var(--gray-100)" : "var(--gray-400)"};
  transition: all 0.2s;

  &:hover {
    color: var(--gray-100);
  }

  white-space: nowrap;
`;

export const StyledTabContent = styled.div`
  padding: 1rem;
  color: var(--gray-100);
`;
