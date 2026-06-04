import { notFound } from "next/navigation";

import { getCustomSkillsAction } from "@/app/actions/getCustomSkillsAction";
import { getMemoryContextAction } from "@/app/actions/getMemoryContextAction";
import { getMemoryReflectionsAction } from "@/app/actions/getMemoryReflectionsAction";
import { listLongTermTasksAction } from "@/app/actions/listLongTermTasksAction";
import { listProjectsAction } from "@/app/actions/listProjects";
import { MemoryPageClient } from "@/components/memory/MemoryPageClient";

type Params = { projectName: string };

export default async function MemoryPage({ params }: { params: Promise<Params> }) {
  const { projectName } = await params;
  const slug = decodeURIComponent(projectName);

  const projects = await listProjectsAction();
  const project = projects.find((p) => p.name === slug);
  if (!project) notFound();

  const [tasksResult, reflectionsResult, contextResult, skillsResult] = await Promise.allSettled([
    listLongTermTasksAction(project.id),
    getMemoryReflectionsAction(project.id, 10),
    getMemoryContextAction(project.id),
    getCustomSkillsAction(project.id),
  ]);

  return (
    <MemoryPageClient
      projectId={project.id}
      projectName={project.name}
      initialTasks={tasksResult.status === "fulfilled" ? tasksResult.value : []}
      initialReflections={reflectionsResult.status === "fulfilled" ? reflectionsResult.value : []}
      initialContext={contextResult.status === "fulfilled" ? contextResult.value : null}
      initialSkills={skillsResult.status === "fulfilled" ? skillsResult.value : []}
    />
  );
}
