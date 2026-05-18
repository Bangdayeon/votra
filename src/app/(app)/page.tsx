import { redirect } from "next/navigation";

import { listProjectsAction } from "@/app/actions/listProjects";
import { EmptyProjectsState } from "@/components/project/EmptyProjectsState";

export default async function HomePage() {
  const projects = await listProjectsAction();
  const first = projects[0];
  if (first) {
    redirect(`/${encodeURIComponent(first.name)}`);
  }
  return <EmptyProjectsState />;
}
