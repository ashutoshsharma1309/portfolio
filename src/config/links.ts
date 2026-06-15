export const SOCIAL_LINKS = {
  github: "https://github.com/ashutoshsharma1309",
  linkedin: "https://www.linkedin.com/in/ashutoshsharma1309/",
  leetcode: "https://leetcode.com/u/agh0r/",
  codeforces: "https://codeforces.com/profile/agh0r",
} as const;

export const CONTACT_EMAIL = "ashutoshsharma1395@gmail.com";

// GitHub handle used for live data fetches (REST API + contributions).
export const GITHUB_USERNAME = "ashutoshsharma1309";

export type SocialKey = keyof typeof SOCIAL_LINKS;
