// ---------------------------------------------------------------------------
// Single source of truth for all portfolio content. Components are presentation
// only — to update the site, edit the data here.
// ---------------------------------------------------------------------------

import type { IconName } from "../components/ui/Icon";

export const BIO = {
  name: "Ashutosh Sharma",
  title: "CS Undergraduate · AI & Backend Engineer",
  // One-liner used by the no-WebGL fallback and meta description.
  summary:
    "Computer Science undergraduate building production-grade full-stack apps, AI-powered developer tools, and automation platforms that solve real problems.",
  education: {
    school: "BMS Institute of Technology & Management",
    degree: "B.E. Computer Science",
    cgpa: "8.7",
  },
  // Full About Me, paragraph by paragraph.
  about: [
    "I am Ashutosh Sharma, a Computer Science undergraduate at BMS Institute of Technology & Management (CGPA: 8.7) passionate about AI, Backend Engineering, Cybersecurity, and scalable software systems.",
    "I enjoy building production-grade full-stack applications, AI-powered developer tools, and automation platforms that solve real-world problems. My interests include Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), DevOps, distributed backend systems, and software architecture.",
    "Beyond academics, I actively participate in hackathons, competitive programming, and open-source development. I have solved 900+ LeetCode problems and enjoy transforming complex ideas into polished products.",
    "I believe in writing clean, scalable, production-ready code while constantly exploring emerging technologies in AI and modern software engineering.",
  ],
};

// ---------- Headline stats (animated counters) ----------

export interface Stat {
  id: string;
  /** Numeric target the counter animates to. */
  value: number;
  /** Suffix appended after the number, e.g. "+". */
  suffix?: string;
  label: string;
}

export const stats: Stat[] = [
  { id: "leetcode", value: 900, suffix: "+", label: "LeetCode Problems" },
  { id: "hackathons", value: 7, suffix: "+", label: "Hackathon Awards" },
  { id: "projects", value: 5, suffix: "", label: "Projects Built" },
  { id: "mentored", value: 100, suffix: "+", label: "Students Mentored" },
];

export const LEETCODE = { count: 900, suffix: "+" };

// ---------- About: focus-area cards ----------

export interface FocusArea {
  id: string;
  label: string;
  description: string;
  icon: IconName;
}

export const focusAreas: FocusArea[] = [
  {
    id: "ai",
    label: "AI Engineering",
    description: "LLMs, RAG, and agentic developer tools built for production.",
    icon: "brain",
  },
  {
    id: "backend",
    label: "Backend Development",
    description: "Distributed systems, queues, and resilient REST APIs.",
    icon: "server",
  },
  {
    id: "security",
    label: "Cybersecurity",
    description: "Secure-by-design auth, CI/CD checks, and threat modeling.",
    icon: "shield",
  },
  {
    id: "fullstack",
    label: "Full Stack Development",
    description: "End-to-end React + Node products, shipped and polished.",
    icon: "layers",
  },
  {
    id: "cp",
    label: "Competitive Programming",
    description: "900+ LeetCode problems — efficient, not just functional.",
    icon: "code",
  },
  {
    id: "hackathons",
    label: "Hackathons",
    description: "7+ podium finishes building fast under pressure.",
    icon: "trophy",
  },
  {
    id: "opensource",
    label: "Open Source",
    description: "Contributing to and maintaining developer-facing tooling.",
    icon: "gitBranch",
  },
];

// ---------- Experience ----------

export interface ExperienceRole {
  id: string;
  org: string;
  role: string;
  bullets: string[];
  tags?: string[];
  icon: IconName;
}

export const experience: ExperienceRole[] = [
  {
    id: "genai-club",
    org: "GenAI Club, BMSIT&M",
    role: "Core Technical Member",
    icon: "brain",
    bullets: [
      "Built LGTM, an AI-powered GitHub PR review and CI/CD security platform.",
      "Selected among the Top Teams at the Nirmith Hackathon.",
      "Engineered a Tree-sitter AST parsing pipeline with PageRank-based repository context selection.",
      "Reduced LLM token usage by nearly 10× compared to full-file review.",
      "Added runtime CI/CD security checks using React, Node.js, MongoDB, Redis, and BullMQ.",
    ],
    tags: ["LLMs", "Node.js", "Redis", "BullMQ", "Tree-sitter"],
  },
  {
    id: "iic",
    org: "Innovation & Incubation Cell (IIC), BMSIT&M",
    role: "Core Technical Member",
    icon: "rocket",
    bullets: [
      "Conducted hands-on Python and AI workshops for 100+ students.",
      "Evaluated startup and blockchain ideas.",
      "Coordinated speakers and college-wide hackathons.",
    ],
    tags: ["Mentorship", "Python", "AI"],
  },
  {
    id: "placement-cell",
    org: "Placement Cell, BMSIT&M",
    role: "Placement Coordinator",
    icon: "briefcase",
    bullets: [
      "Helped organize placement drives.",
      "Coordinated aptitude tests.",
      "Assisted in pre-placement talks.",
    ],
    tags: ["Leadership", "Coordination"],
  },
];

// ---------- Projects ----------

/** Project status badge. Drives the colored status pill in the Projects panel. */
export type ProjectStatus = "live" | "in-progress" | "archived" | "concept";

export interface ProjectCaseStudy {
  problem?: string;
  approach?: string;
  impact?: string;
  futureWork?: string[];
}

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
  /** Shows a distinct "Flagship" badge — the single best project. */
  flagship?: boolean;
  status: ProjectStatus;
  timeline?: string;
  tags?: string[];
  highlights?: string[];
  liveUrl?: string;
  githubUrl?: string;
  images?: string[];
  /** Two CSS color stops used for the generated cover + accent glow. */
  accent: [string, string];
  caseStudy?: ProjectCaseStudy;
}

export const projects: Project[] = [
  {
    id: "lgtm",
    title: "LGTM — AI Code Review & Repository Intelligence",
    tagline: "An AI reviewer that understands your whole repo, not just the diff.",
    description:
      "An AI-powered GitHub PR review and CI/CD security platform. It parses entire repositories into ASTs, compresses them into compact context maps, and routes reviews across multiple LLM providers with per-key rate-limit isolation — cutting token usage by ~10× versus full-file review.",
    techStack: [
      "React",
      "Node.js",
      "MongoDB",
      "Redis",
      "BullMQ",
      "Tree-sitter",
      "LLMs",
    ],
    featured: true,
    flagship: true,
    status: "in-progress",
    timeline: "2025",
    tags: ["AI", "Backend", "Developer Tools", "Security"],
    highlights: [
      "Parsed repositories using Tree-sitter AST across 12 programming languages",
      "Built a PageRank-based repository context compression engine",
      "Generated optimized 4K-token repository maps",
      "Integrated Anthropic (Claude), OpenAI, and Gemini APIs",
      "Added per-key pooling, retries, and BYOK rate-limit isolation",
      "Implemented multi-agent indexing using BullMQ and Redis",
      "Built Socket.io live progress",
      "Developed 20+ REST APIs",
      "Added secure GitHub webhook verification",
    ],
    accent: ["#6366f1", "#0ea5e9"],
    caseStudy: {
      problem:
        "Sending whole files to an LLM for every PR is expensive, slow, and blind to the rest of the codebase — reviews miss cross-file context and burn tokens.",
      approach:
        "Parse the repository into ASTs with Tree-sitter, rank symbols with PageRank to keep only what matters, and compress that into a ~4K-token repository map. Reviews are fanned out across providers via a BullMQ/Redis multi-agent indexer with per-key pooling and retries.",
      impact:
        "Reduced LLM token usage by nearly 10× versus full-file review while giving the model true repo-wide context — and earned a Top Team spot at the Nirmith Hackathon.",
      futureWork: [
        "Inline auto-fix suggestions committed back via the GitHub API",
        "Self-hosted model support for privacy-sensitive teams",
      ],
    },
  },
  {
    id: "prepnext",
    title: "PrepNext — Campus Placement Platform",
    tagline: "Everything a student needs to crack campus placements, in one place.",
    description:
      "A complete campus placement preparation platform unifying recruiters, previous-year questions, DSA practice, and mock assessments behind a normalized PostgreSQL backend with Google OAuth and JWT auth, and QR-verifiable certificates.",
    techStack: [
      "React",
      "TypeScript",
      "Express.js",
      "Node.js",
      "Prisma",
      "PostgreSQL",
      "Supabase",
    ],
    featured: true,
    status: "live",
    timeline: "2025",
    tags: ["Full-Stack", "EdTech", "PostgreSQL"],
    highlights: [
      "Unified 85+ recruiters and 20+ placement routes",
      "Added 82+ verified PYQs and 150+ DSA problems",
      "Designed a normalized PostgreSQL schema with Prisma",
      "Implemented Google OAuth + JWT authorization and profile onboarding",
      "Added mock online assessment tests",
      "Generated QR-verifiable certificates",
      "Fully responsive, WCAG-compliant interface",
    ],
    accent: ["#0d9488", "#22c55e"],
    caseStudy: {
      problem:
        "Placement prep is scattered across PDFs, chat groups, and spreadsheets, with no single trusted source for recruiters, PYQs, and practice.",
      approach:
        "A unified platform on a normalized PostgreSQL schema (via Prisma) with Google OAuth + JWT, profile onboarding, mock assessments, and QR-verifiable certificates — all behind a responsive, accessible UI.",
      impact:
        "Gives students one verified, structured hub covering 85+ recruiters, 82+ PYQs, and 150+ DSA problems across 20+ placement routes.",
    },
  },
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
    id: "cardiac-risk-predictor",
    title: "Cardiac Risk Predictor",
    tagline: "Wearable early-warning system for cardiac emergencies.",
    description:
      "iOS + watchOS app that continuously streams heart rate and SpO₂ from HealthKit, runs an on-device anomaly detector for cardiac-risk signals, and auto-dispatches the user's live GPS coordinates to the nearest registered hospital — built for the worst case where the user can't reach their phone.",
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
        "Continuously monitor HealthKit vitals on the watch, run an on-device detector for cardiac-risk signatures, and auto-escalate live location to emergency services without requiring any user action.",
      impact:
        "Closes the critical gap between an event and a response when seconds decide survival.",
      futureWork: [
        "Clinical validation of the detection thresholds",
        "Fall + impact fusion to reduce false positives",
      ],
    },
  },
];

// ---------- Powerlifting ----------

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

// Bodyweight is the weight-class context for the PRs above. The per-lift
// numbers live once in POWERLIFTING_PRS (single source of truth).
export const powerlifting = {
  bodyweight: { value: BODYWEIGHT_KG, unit: "kg" as const },
};

// ---------- Technical skills ----------

export interface SkillCategory {
  id: string;
  title: string;
  icon: IconName;
  skills: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    id: "languages",
    title: "Languages",
    icon: "code",
    skills: ["C", "C++", "Python", "Java", "JavaScript", "TypeScript", "Swift", "SQL"],
  },
  {
    id: "backend",
    title: "Backend",
    icon: "server",
    skills: ["Node.js", "Express.js", "FastAPI", "Flask", "React.js"],
  },
  {
    id: "infra",
    title: "Databases & Infrastructure",
    icon: "database",
    skills: [
      "MongoDB",
      "PostgreSQL",
      "MySQL",
      "Prisma",
      "Redis",
      "BullMQ",
      "Docker",
      "AWS",
    ],
  },
  {
    id: "aiml",
    title: "AI / ML",
    icon: "brain",
    skills: [
      "Claude API",
      "OpenAI API",
      "Gemini API",
      "Groq",
      "LangChain",
      "Tree-sitter",
      "TensorFlow",
      "Scikit-learn",
    ],
  },
  {
    id: "blockchain",
    title: "Blockchain",
    icon: "blocks",
    skills: ["Solidity", "Hyperledger", "Web3.js"],
  },
  {
    id: "tools",
    title: "Tools",
    icon: "wrench",
    skills: ["Git", "GitHub", "Linux", "Postman", "Wireshark", "Figma"],
  },
];

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
        title: "VTU Inter-College Representation",
        organization: "Tug of War — College Team, BMSIT&M",
        description:
          "Represented BMSIT&M at the VTU inter-college level as anchor of the tug of war team — the last position on the rope, responsible for locking the team in place against opposing pulls.",
        prize: "🎽 University Level",
      },
      {
        id: "tugofwar-inter-hostel",
        title: "Gold — Inter-Hostel Championship",
        organization: "Tug of War — College Team, BMSIT&M",
        description:
          "Anchored the team to a 1st place finish in the inter-hostel championship, holding the line across consecutive rounds against heavier opposing teams.",
        prize: "🥇 Gold",
      },
      {
        id: "tugofwar-inter-dept",
        title: "Gold — Inter-Department Championship",
        organization: "Tug of War — College Team, BMSIT&M",
        description:
          "Anchored the team to a 1st place finish in the inter-departmental championship and helped build and train the team's pulling sequence in the lead-up to the event.",
        prize: "🥇 Gold",
      },
    ],
  },
  hackathons: {
    id: "hackathons",
    title: "HACKATHONS & ACHIEVEMENTS",
    subtitle: "Built fast, shipped faster.",
    achievements: [
      {
        id: "aayam",
        title: "1st Runner Up",
        organization: "Aayam Hackathon — Newton College of Engineering",
        date: "2026",
        prize: "🥈 1st Runner Up",
      },
      {
        id: "build-for-bangalore",
        title: "Top 5 Team",
        organization: "Build for Bangalore Hackathon",
        date: "2026",
        prize: "🏅 Top 5",
      },
      {
        id: "nmit-hacks",
        title: "IoT Track Winner",
        organization: "NMIT Hacks",
        date: "2025",
        prize: "🏆 Track Winner",
      },
      {
        id: "genai-10day",
        title: "1st Prize — 10-Day Hackathon",
        organization: "GenAI Club, BMSIT&M",
        date: "2025",
        prize: "🥇 1st Prize",
      },
      {
        id: "rvce",
        title: "2nd Prize",
        organization: "RVCE Hackathon",
        date: "2025",
        prize: "🥈 2nd Prize",
      },
      {
        id: "ecell",
        title: "2nd Prize",
        organization: "E-Cell Hackathon, BMSIT&M",
        date: "2025",
        prize: "🥈 2nd Prize",
      },
      {
        id: "kalarava",
        title: "Best 2nd-Year Team",
        organization: "Kalarava Coding Competition, BMSIT&M",
        date: "2025",
        prize: "🏆 Best Team",
      },
    ],
  },
};
