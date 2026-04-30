export const SOCIAL_LINKS = {
  github: "https://github.com/ashutoshsharma1309",
  linkedin: "https://www.linkedin.com/in/ashutoshsharma1309/",
  leetcode: "https://leetcode.com/u/der3k/",
  codeforces: "https://codeforces.com/profile/agh0r",
} as const;

export const CONTACT_EMAIL = "ashutoshsharma1395@gmail.com";

export type SocialKey = keyof typeof SOCIAL_LINKS;
