export const BIO = {
  name: "Ashutosh Sharma",
  title: "Second Year CS Student · SWE & ML Engineer",
  summary:
    "I build end-to-end systems from training ML models on messy datasets to shipping React frontends that put them in real users' hands. Currently studying CS, lifting heavy, and coding.",
  pitch:
    "Actively looking for SWE / ML Engineer roles. I ship production-ready code, scale systems that deliver real impact, and bridge the gap between ML experiments and user-facing products. Strong DSA fundamentals (LeetCode 800+, Codeforces 500+) ensure my code is efficient, not just functional.",
  highlights: [
    "Full-stack web (React, Node, Postgres)",
    "Machine learning (PyTorch, scikit-learn)",
    "Competitive programming (Codeforces, LeetCode)",
    "Powerlifting — strength is a software discipline",
  ],
};

export interface Project {
  id: string;
  title: string;
  description: string; // 2-3 sentences
  techStack: string[]; // shown as yellow pill tags
}

export const projects: Project[] = [
  {
    id: "authentix",
    title: "Authentix",
    description:
      "Decentralized ticket booking platform that binds every ticket to a verified national identity via DigiLocker OAuth, killing bot mass-booking and resale scalping. Tickets are minted as non-transferable on-chain credentials, so the person who buys is the person who shows up — fair for organizers, fair for genuine fans.",
    techStack: [
      "Next.js",
      "Solidity",
      "Polygon",
      "DigiLocker OAuth",
      "Node.js",
      "MongoDB",
      "Ethers.js",
    ],
  },
  {
    id: "agrismart",
    title: "AgriSmart",
    description:
      "Multi-feature agritech platform combining a crop advisory engine, CV-based leaf disease detector, hyperlocal weather alerts, and a multilingual farmer chatbot. The disease detector runs a fine-tuned CNN on uploaded leaf photos and returns diagnosis plus treatment steps in the farmer's own language.",
    techStack: [
      "React",
      "FastAPI",
      "PyTorch",
      "TensorFlow",
      "OpenWeather API",
      "LangChain",
      "PostgreSQL",
    ],
  },
  {
    id: "cardiac-detector",
    title: "Cardiac Detector",
    description:
      "iOS + watchOS app that continuously streams heart rate and SpO2 from HealthKit, runs an on-device anomaly detector for cardiac arrest signals, and auto-dispatches the user's live GPS coordinates to the nearest registered hospital. Designed for the worst-case scenario where the user can't reach for their phone.",
    techStack: [
      "Swift",
      "SwiftUI",
      "WatchKit",
      "HealthKit",
      "CoreLocation",
      "Firebase",
    ],
  },
  {
    id: "truebid",
    title: "TrueBid",
    description:
      "Online auction platform that replaces standard ascending-price bidding with game-theoretic mechanisms inspired by sealed-bid second-price (Vickrey) auctions. Bidders are incentivized to bid their true valuation, sniping and shilling lose their edge, and outcomes are provably fair to both buyer and seller.",
    techStack: [
      "Next.js",
      "TypeScript",
      "Node.js",
      "WebSockets",
      "PostgreSQL",
      "Redis",
    ],
  },
  {
    id: "teachers-choice",
    title: "Teacher's Choice",
    description:
      "Centralized exam-prep hub for VTU undergrads — organized notes, previous-year papers, model questions, and module-wise content for all 8 semesters across major branches. Built to replace the chaotic WhatsApp-forward economy that VTU students currently rely on the night before exams.",
    techStack: [
      "Next.js",
      "TypeScript",
      "MongoDB",
      "Cloudinary",
      "TailwindCSS",
      "NextAuth",
    ],
  },
  {
    id: "header-analyser",
    title: "Header Analyser",
    description:
      "Web security audit tool that scans any URL's HTTP response headers — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, and more — and returns a security score out of 10 with concrete remediation steps. Built so non-security devs can get a fast read on how exposed their deployments actually are.",
    techStack: [
      "Next.js",
      "Node.js",
      "TypeScript",
      "TailwindCSS",
      "Vercel Edge Functions",
    ],
  },
];

export interface PR {
  lift: string;
  weight: string;
  unit: "kg" | "lb";
}

export const BODYWEIGHT_KG = 85;

export const POWERLIFTING_PRS: PR[] = [
  { lift: "Squat", weight: "180", unit: "kg" },
  { lift: "Bench Press", weight: "135", unit: "kg" },
  { lift: "Deadlift", weight: "215", unit: "kg" },
];

// Structured powerlifting object for any future readers — bodyweight as
// metadata, separated from the lift PRs.
export const powerlifting = {
  bodyweight: { value: BODYWEIGHT_KG, unit: "kg" as const },
  squat: { weight: 180, unit: "kg" as const },
  bench: { weight: 135, unit: "kg" as const },
  deadlift: { weight: 215, unit: "kg" as const },
};

export const WHITEBOARD_TEXT = "WELCOME!\nEnjoy your\nexperience";

// ---------- Trophies / Achievements ----------

export interface Achievement {
  id: string;
  title: string;
  organization?: string;
  date?: string;
  description?: string;
  prize?: string;
}

export type TrophyCategoryId = "sports" | "hackathons";

export interface TrophyCategory {
  id: TrophyCategoryId;
  title: string;
  subtitle: string;
  achievements: Achievement[];
}

export const trophies: Record<TrophyCategoryId, TrophyCategory> = {
  sports: {
    id: "sports",
    title: "SPORTS & ATHLETICS",
    subtitle: "Anchor on the rope. Last man standing.",
    achievements: [
      {
        id: "tugofwar-vtu",
        title: "Anchor — VTU Tug of War Team",
        organization: "Visvesvaraya Technological University",
        description:
          "Selected as anchor for the VTU university-level tug of war team — the last position on the rope, responsible for locking the team in place against opposing pulls. Represented the university across inter-collegiate fixtures.",
      },
      {
        id: "tugofwar-inter-hostel",
        title: "1st Place — Inter-Hostel Tug of War",
        organization: "BMSIT — CSE Hostel Team",
        description:
          "Anchored the CSE hostel tug of war team to a 1st place finish in the inter-hostel championship. Held the line in three consecutive rounds against heavier opposing teams.",
        prize: "🥇 Gold",
      },
      {
        id: "tugofwar-inter-dept",
        title: "1st Place — Inter-Department Tug of War",
        organization: "BMSIT — CSE Department Team",
        description:
          "Anchored the CSE department tug of war team to a 1st place finish in the inter-departmental championship. Built and trained the team's pulling sequence in the lead-up to the event.",
        prize: "🥇 Gold",
      },
    ],
  },
  hackathons: {
    id: "hackathons",
    title: "HACKATHONS & TECH WINS",
    subtitle: "Built fast, shipped faster.",
    achievements: [
      {
        id: "placeholder-hackathon-1",
        title: "Achievement Title",
        organization: "Hackathon / Competition Name",
        date: "Month Year",
        description:
          "Short description of what this win was. Replace with real content.",
        prize: "Optional — cash prize, swag, accelerator slot, etc.",
      },
    ],
  },
};
