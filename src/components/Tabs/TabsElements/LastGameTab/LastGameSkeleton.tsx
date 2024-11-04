import styled, { keyframes } from "styled-components";

export const LastGameSkeleton = () => {
  return (
    <SkeletonContainer>
      <SkeletonTitle />
      <SkeletonText />
      <SkeletonText />
      <SkeletonVideo />
    </SkeletonContainer>
  );
};

// Styled components for the skeleton
const SkeletonContainer = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const pulse = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
`;

const SkeletonTitle = styled.div`
  width: 60%;
  height: 1.5rem;
  background-color: var(--gray-700);
  border-radius: 4px;
  animation: ${pulse} 1.5s infinite ease-in-out;
`;

const SkeletonText = styled.div`
  width: 80%;
  height: 1rem;
  background-color: var(--gray-700);
  border-radius: 4px;
  animation: ${pulse} 1.5s infinite ease-in-out;
`;

const SkeletonVideo = styled.div`
  width: 100%;
  height: 300px;
  background-color: var(--gray-700);
  border-radius: 8px;
  animation: ${pulse} 1.5s infinite ease-in-out;
`;
