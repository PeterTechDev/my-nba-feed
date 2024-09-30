import { StyledAvatar } from "./Avatar.styles";

interface AvatarProps {
  src: string;
  alt: string;
  rounded?: boolean;
}

export default function Avatar({ src, alt, rounded }: AvatarProps) {
  return <StyledAvatar src={src} alt={alt} rounded={rounded} />;
}
