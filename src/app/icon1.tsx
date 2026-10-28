import { brandIcon } from "@/lib/brand-icon";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Icon() {
  return brandIcon(192);
}
