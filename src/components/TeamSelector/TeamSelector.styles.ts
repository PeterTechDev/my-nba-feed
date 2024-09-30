import styled from "styled-components";

// Overlay to darken background when modal is open
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

// Modal container for content
export const ModalContent = styled.div`
  background: var(--gray-800);
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 400px;
  color: var(--gray-100);

  h2 {
    margin-bottom: 1rem;
    text-align: center;
    color: ${({ theme }) => theme.colors.primary};
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 0.5rem 1rem;
    margin: 0.5rem 0;
    border: 1px solid ${({ theme }) => theme.colors.primary};
    border-radius: 8px;
    cursor: pointer;
    text-align: center;

    &:hover {
      background: ${({ theme }) => theme.colors.primary};
      color: var(--gray-800);
      transition: background-color 0.1s;
    }
  }
`;

// Wrapper to position the button
export const SelectorWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
`;

export const SelectorButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 8px;
  height: 50px;
  padding: 0 1.5rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.1s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: var(--gray-100);
  }

  @media (min-width: 768px) {
    width: auto;
  }
`;
