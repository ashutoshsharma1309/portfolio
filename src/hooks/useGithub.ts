import { useEffect, useState } from "react";
import { GITHUB_USERNAME } from "../config/links";

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
  fork: boolean;
}

export interface GitHubData {
  publicRepos: number;
  followers: number;
  totalStars: number;
  contributionsLastYear: number | null;
  repos: GitHubRepo[];
}

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: GitHubData };

// Module-level cache so the data is fetched once per session and shared
// across every panel mount (panels unmount when the user navigates away).
let cache: GitHubData | null = null;
let inflight: Promise<GitHubData> | null = null;

async function fetchGitHubData(): Promise<GitHubData> {
  const base = "https://api.github.com";
  const headers = { Accept: "application/vnd.github+json" };

  const [userRes, reposRes] = await Promise.all([
    fetch(`${base}/users/${GITHUB_USERNAME}`, { headers }),
    fetch(
      `${base}/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
      { headers },
    ),
  ]);

  if (!userRes.ok || !reposRes.ok) {
    throw new Error(
      `GitHub API responded ${userRes.status}/${reposRes.status}` +
        (userRes.status === 403 ? " (rate limited — try again later)" : ""),
    );
  }

  const user = await userRes.json();
  const allRepos: GitHubRepo[] = await reposRes.json();

  const repos = allRepos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count);

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

  // Contribution count isn't in the official REST API; this free, CORS-enabled
  // service derives it from the public profile. Best-effort — null on failure.
  let contributionsLastYear: number | null = null;
  try {
    const contribRes = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`,
    );
    if (contribRes.ok) {
      const contrib = await contribRes.json();
      contributionsLastYear = contrib?.total?.lastYear ?? null;
    }
  } catch {
    // ignore — contributions are optional decoration
  }

  return {
    publicRepos: user.public_repos ?? repos.length,
    followers: user.followers ?? 0,
    totalStars,
    contributionsLastYear,
    repos,
  };
}

export function useGithub(): State {
  const [state, setState] = useState<State>(
    cache ? { status: "ready", data: cache } : { status: "loading" },
  );

  useEffect(() => {
    if (cache) {
      setState({ status: "ready", data: cache });
      return;
    }

    let active = true;
    inflight ??= fetchGitHubData();
    inflight
      .then((data) => {
        cache = data;
        if (active) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        inflight = null; // allow a retry on next mount
        if (active)
          setState({
            status: "error",
            error: err instanceof Error ? err.message : "Failed to load",
          });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
