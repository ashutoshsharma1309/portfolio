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

/**
 * Project status badge. Drives the colored status pill in the Projects panel.
 */
export type ProjectStatus = "live" | "in-progress" | "archived" | "concept";

export interface ProjectLink {
  label: string;
  href: string;
}

/**
 * Optional long-form case study. Recruiters who want depth can expand it;
 * everyone else sees the concise card. Every field is optional so projects can
 * carry as much or as little narrative as they warrant.
 */
export interface ProjectCaseStudy {
  problem?: string;
  approach?: string;
  impact?: string;
  futureWork?: string[];
}

/**
 * Curated, statically-typed project record. This is the single source of truth
 * for the Projects panel — no GitHub API, no runtime fetch, no private-repo
 * blind spots. To add a project, append an entry here; the UI adapts to
 * whatever optional fields are present.
 */
export interface Project {
  id: string;
  title: string;
  /** One-line hook shown under the title. */
  tagline: string;
  /** 2–3 sentence summary. */
  description: string;
  /** Core technologies, rendered as pill tags. */
  techStack: string[];
  /** Promotes the project into the "Featured" group with a badge. */
  featured?: boolean;
  status: ProjectStatus;
  /** Human-readable timeline, e.g. "2024" or "Mar–Jun 2024". */
  timeline?: string;
  /** High-level domain tags, e.g. "Web3", "Machine Learning". */
  tags?: string[];
  /** Outcome / what-makes-it-interesting bullets. */
  highlights?: string[];
  liveUrl?: string;
  /** Optional — many repos are private, so this is frequently omitted. */
  githubUrl?: string;
  /** Optional screenshot URLs. When absent, a generated gradient cover is used. */
  images?: string[];
  /** Two CSS color stops used for the generated cover + accent glow. */
  accent: [string, string];
  caseStudy?: ProjectCaseStudy;
}

export const projects: Project[] = [
  {
    id: "authentix",
    title: "Authentix",
    tagline: "Identity-bound, scalp-proof event ticketing on-chain.",
    description:
      "Decentralized ticket booking platform that binds every ticket to a verified national identity via DigiLocker OAuth, killing bot mass-booking and resale scalping. Tickets are minted as non-transferable on-chain credentials, so the person who buys is the person who shows up.",
    techStack: [
      "Next.js",
      "Solidity",
      "Polygon",
      "DigiLocker OAuth",
      "Node.js",
      "MongoDB",
      "Ethers.js",
    ],
    featured: true,
    status: "live",
    timeline: "2024",
    tags: ["Web3", "Full-Stack", "Identity"],
    highlights: [
      "Non-transferable soulbound tickets eliminate the resale market entirely",
      "DigiLocker OAuth ties one verified identity to each purchase",
      "Gasless mint flow so non-crypto users never touch a wallet",
    ],
    accent: ["#7c3aed", "#2563eb"],
    caseStudy: {
      problem:
        "Bots mass-book popular events in seconds and resell at 5–10× on secondary markets, locking out genuine fans and starving organizers of revenue.",
      approach:
        "Each ticket is minted as a soulbound (non-transferable) token bound to a DigiLocker-verified identity. Purchase limits are enforced on-chain, and entry is validated against the holder's verified identity rather than a transferable QR code.",
      impact:
        "Resale scalping becomes structurally impossible — a ticket can only be used by the verified buyer, restoring fair access and organizer revenue.",
      futureWork: [
        "Delegated transfers for legitimate gifting with re-verification",
        "Dynamic anti-bot pricing during demand spikes",
      ],
    },
  },
  {
    id: "agrismart",
    title: "AgriSmart",
    tagline: "An AI agronomist in every farmer's pocket.",
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
    featured: true,
    status: "live",
    timeline: "2024",
    tags: ["Machine Learning", "Computer Vision", "Full-Stack"],
    highlights: [
      "Fine-tuned CNN diagnoses leaf disease from a single phone photo",
      "Treatment guidance delivered in the farmer's native language",
      "Hyperlocal weather alerts + LangChain advisory chatbot in one app",
    ],
    accent: ["#16a34a", "#65a30d"],
    caseStudy: {
      problem:
        "Smallholder farmers lose entire harvests to diseases they can't identify in time, and expert agronomists are scarce and expensive.",
      approach:
        "A fine-tuned CNN classifies disease from a leaf photo and maps it to an actionable treatment plan, surfaced through a multilingual chatbot alongside hyperlocal weather data.",
      impact:
        "Turns a smartphone into a first-line crop diagnostic, putting expert-level advisory in the hands of farmers who'd otherwise have none.",
      futureWork: [
        "On-device inference for offline, low-connectivity villages",
        "Expand the disease class set with region-specific crops",
      ],
    },
  },
  {
    id: "cardiac-detector",
    title: "Cardiac Detector",
    tagline: "Wearable early-warning system for cardiac emergencies.",
    description:
      "iOS + watchOS app that continuously streams heart rate and SpO₂ from HealthKit, runs an on-device anomaly detector for cardiac-arrest signals, and auto-dispatches the user's live GPS coordinates to the nearest registered hospital — built for the worst case where the user can't reach their phone.",
    techStack: [
      "Swift",
      "SwiftUI",
      "WatchKit",
      "HealthKit",
      "CoreLocation",
      "Firebase",
    ],
    status: "in-progress",
    timeline: "2024",
    tags: ["iOS", "watchOS", "HealthTech"],
    highlights: [
      "On-device anomaly detection on live HR + SpO₂ streams",
      "Auto-dispatches GPS location to the nearest hospital, hands-free",
      "Designed around the user being incapacitated — zero interaction needed",
    ],
    accent: ["#dc2626", "#db2777"],
    caseStudy: {
      problem:
        "Sudden cardiac events are often fatal because the victim can't call for help and bystanders don't know it's happening.",
      approach:
        "Continuously monitor HealthKit vitals on the watch, run an on-device detector for cardiac-arrest signatures, and auto-escalate live location to emergency services without requiring any user action.",
      impact:
        "Closes the critical gap between an event and a response when seconds decide survival.",
      futureWork: [
        "Clinical validation of the detection thresholds",
        "Fall + impact fusion to reduce false positives",
      ],
    },
  },
  {
    id: "truebid",
    title: "TrueBid",
    tagline: "Game-theoretically fair online auctions.",
    description:
      "Online auction platform that replaces standard ascending-price bidding with mechanisms inspired by sealed-bid second-price (Vickrey) auctions. Bidders are incentivized to bid their true valuation, sniping and shilling lose their edge, and outcomes are provably fair to both buyer and seller.",
    techStack: [
      "Next.js",
      "TypeScript",
      "Node.js",
      "WebSockets",
      "PostgreSQL",
      "Redis",
    ],
    status: "in-progress",
    timeline: "2024",
    tags: ["Full-Stack", "Real-Time", "Systems"],
    highlights: [
      "Vickrey-style mechanism makes bidding your true value the optimal strategy",
      "Real-time bid state over WebSockets with Redis-backed fan-out",
      "Sniping and shill bidding are designed out, not patched over",
    ],
    accent: ["#0891b2", "#0d9488"],
    caseStudy: {
      problem:
        "Classic ascending auctions reward last-second sniping and seller-side shill bidding — the bidder with the best strategy wins, not the one who values the item most.",
      approach:
        "Adopt a sealed-bid second-price mechanism where truthful bidding is the dominant strategy, served over a real-time WebSocket layer backed by Redis for consistency under load.",
      impact:
        "Auction outcomes become strategy-proof and provably fair to both sides of the market.",
    },
  },
  {
    id: "teachers-choice",
    title: "Teacher's Choice",
    tagline: "The exam-prep hub VTU students actually need.",
    description:
      "Centralized exam-prep hub for VTU undergrads — organized notes, previous-year papers, model questions, and module-wise content for all 8 semesters across major branches. Built to replace the chaotic WhatsApp-forward economy students rely on the night before exams.",
    techStack: [
      "Next.js",
      "TypeScript",
      "MongoDB",
      "Cloudinary",
      "TailwindCSS",
      "NextAuth",
    ],
    status: "live",
    timeline: "2023",
    tags: ["Full-Stack", "EdTech"],
    highlights: [
      "Module-wise content across all 8 semesters and major branches",
      "Cloudinary-backed uploads with NextAuth-gated contributions",
      "Replaces last-minute WhatsApp forwarding with a searchable library",
    ],
    accent: ["#d97706", "#ca8a04"],
  },
  {
    id: "header-analyser",
    title: "Header Analyser",
    tagline: "Instant HTTP security-header audit for any URL.",
    description:
      "Web security audit tool that scans any URL's HTTP response headers — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, and more — and returns a security score out of 10 with concrete remediation steps, so non-security devs can gauge how exposed their deployments really are.",
    techStack: [
      "Next.js",
      "Node.js",
      "TypeScript",
      "TailwindCSS",
      "Vercel Edge Functions",
    ],
    status: "live",
    timeline: "2023",
    tags: ["Security", "Developer Tools"],
    highlights: [
      "Scores any URL out of 10 with prioritized, actionable fixes",
      "Runs on Vercel Edge Functions for low-latency global scans",
      "Explains each header so non-security devs learn while they audit",
    ],
    accent: ["#475569", "#0f766e"],
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
    achievements: [],
  },
};
