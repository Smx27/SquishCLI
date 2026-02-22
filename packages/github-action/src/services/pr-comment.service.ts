import * as github from "@actions/github";

export async function commentOnPullRequest(body: string): Promise<boolean> {
  if (github.context.eventName !== "pull_request") {
    return false;
  }

  const pullRequestNumber = github.context.payload.pull_request?.number;
  const token = process.env.GITHUB_TOKEN;

  if (!token || !pullRequestNumber) {
    return false;
  }

  const octokit = github.getOctokit(token);
  await octokit.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: pullRequestNumber,
    body
  });

  return true;
}
