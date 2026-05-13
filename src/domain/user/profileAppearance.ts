export const PROFILE_COLORS = [
  "D38FDA",
  "FFD771",
  "E57369",
  "57E6C5",
  "96BCE7",
  "B7BDC5",
] as const;

export const PROFILE_IMAGES = [
  "/assets/images/profile_dog.png",
  "/assets/images/profile_cat.png",
  "/assets/images/profile_capybara.png",
] as const;

export type ProfileColor = (typeof PROFILE_COLORS)[number];
export type ProfileImage = (typeof PROFILE_IMAGES)[number];

export function isProfileColor(value: string): value is ProfileColor {
  return (PROFILE_COLORS as readonly string[]).includes(value);
}

export function isProfileImage(value: string): value is ProfileImage {
  return (PROFILE_IMAGES as readonly string[]).includes(value);
}

export function randomProfileAppearance(): {
  profileColor: ProfileColor;
  profileImage: ProfileImage;
} {
  const color = PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];
  const image = PROFILE_IMAGES[Math.floor(Math.random() * PROFILE_IMAGES.length)];
  return { profileColor: color, profileImage: image };
}
