import "server-only";

import { execSync } from "child_process";

import type { GitClient, GitCommit } from "@/application/ports/gitClient";

export const processGitClient: GitClient = {
  getRecentCommits: async (cwd, limit) => {
    try {
      const output = execSync(
        `git log --pretty=format:"%h|%s|%ad" --date=short -n ${limit}`,
        { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
      );
      return output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [hash, message, date] = line.split("|");
          return { hash: hash ?? "", message: message ?? "", date: date ?? "" };
        });
    } catch {
      return [];
    }
  },
};
