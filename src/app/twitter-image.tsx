import { createSocialImage, socialImageSize } from "@/app/social-image";

export const alt =
  "RWA X-Ray — transparent market-capacity intelligence for tokenized real-world assets";
export const size = socialImageSize;
export const contentType = "image/png";

export default function TwitterImage() {
  return createSocialImage();
}
