export type GitCommit = { hash: string; message: string; date: string };

export type GitClient = {
  getRecentCommits: (cwd: string, limit: number) => Promise<GitCommit[]>;
};
