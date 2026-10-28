import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Icon() {
  return brandIcon(512);
}
