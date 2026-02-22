import { readFileSync } from "node:fs";

interface PullRequestPayload {
  pull_request?: { number?: number };
}

function parseContextPayload(): PullRequestPayload {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return {};

  try {
    return JSON.parse(readFileSync(eventPath, "utf8")) as PullRequestPayload;
  } catch {
    return {};
  }
}

export const context = {
  eventName: process.env.GITHUB_EVENT_NAME ?? "",
  payload: parseContextPayload(),
  repo: {
    owner: process.env.GITHUB_REPOSITORY?.split("/")[0] ?? "",
    repo: process.env.GITHUB_REPOSITORY?.split("/")[1] ?? ""
  }
};

export function getOctokit(token: string) {
  return {
    rest: {
      issues: {
        async createComment(params: { owner: string; repo: string; issue_number: number; body: string }): Promise<void> {
          if (!token) {
            throw new Error("Missing GitHub token.");
          }
          process.stdout.write(
            `PR comment (simulated): ${params.owner}/${params.repo}#${params.issue_number}: ${params.body}\n`
          );
        }
      }
    }
  };
}
