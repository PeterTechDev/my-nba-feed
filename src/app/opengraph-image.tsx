import { shareCard, shareImageAlt, shareImageSize } from "@/lib/share-card";

export const alt = shareImageAlt;
export const size = shareImageSize;
export const contentType = "image/png";
export const runtime = "nodejs";

export default function OpenGraphImage() {
  return shareCard();
}
