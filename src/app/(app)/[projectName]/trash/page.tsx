import { notFound } from "next/navigation";

import { listProjectsAction } from "@/app/actions/listProjects";
import { listTrashedTasksPageAction } from "@/app/actions/listTrashedTasks";
import { TrashPageClient } from "@/components/memory/TrashPageClient";

type Params = { projectName: string };

export default async function TrashPage({ params }: { params: Promise<Params> }) {
  const { projectName } = await params;
  const slug = decodeURIComponent(projectName);

  const projects = await listProjectsAction();
  const project = projects.find((p) => p.name === slug);
  if (!project) notFound();

  const { tasks, total } = await listTrashedTasksPageAction(project.id, 1, 20);

  return <TrashPageClient projectId={project.id} initialTasks={tasks} initialTotal={total} />;
}
