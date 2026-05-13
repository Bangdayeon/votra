"use server";

import {
  discoverClaudeProjects,
  type DiscoveredClaudeProject,
} from "@/infrastructure/localScan/discoverClaudeProjects";

export type DiscoverProjectsResult = {
  claude: DiscoveredClaudeProject[];
};

export async function discoverProjects(): Promise<DiscoverProjectsResult> {
  const claude = await discoverClaudeProjects();
  return { claude };
}
