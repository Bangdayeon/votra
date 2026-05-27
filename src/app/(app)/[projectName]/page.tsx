import type { Metadata } from "next";

import { getAgentContextFlowDiagnosisAction } from "@/app/actions/getAgentContextFlowDiagnosis";
import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import { getProjectMembersAction } from "@/app/actions/getProjectMembers";
import { getProjectNextTasksAction } from "@/app/actions/getProjectNextTasks";
import { getProjectTasksAction } from "@/app/actions/getProjectTasks";
import { listClaudeFilesAction } from "@/app/actions/listClaudeFiles";
import { listPolicyRulesAction } from "@/app/actions/listPolicyRules";
import { listProjectsAction } from "@/app/actions/listProjects";
import {
  ProjectPageClient,
  type ProjectPageInitialData,
} from "@/app/(app)/[projectName]/ProjectPageClient";

type Params = { projectName: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { projectName } = await params;
  let title = projectName;
  try {
    title = decodeURIComponent(projectName);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  return { title };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { projectName } = await params;
  const slug = decodeURIComponent(projectName);

  const projects = await listProjectsAction();
  const project = projects.find((p) => p.name === slug);

  let initialData: ProjectPageInitialData | null = null;

  if (project) {
    const [summary, nextTasks, filesResult, rulesResult, diagnosis, tasks, members] =
      await Promise.allSettled([
        getProjectAiSummaryAction(project.id),
        getProjectNextTasksAction(project.id),
        listClaudeFilesAction(project.id),
        listPolicyRulesAction(),
        getAgentContextFlowDiagnosisAction(project.id),
        getProjectTasksAction(project.id),
        getProjectMembersAction(project.id),
      ]);

    initialData = {
      overview: {
        aiSummary: summary.status === "fulfilled" ? summary.value : null,
        nextTasks: nextTasks.status === "fulfilled" ? nextTasks.value : null,
      },
      manage: {
        files:
          filesResult.status === "fulfilled"
            ? filesResult.value
            : { records: [], criteria: { basic: true, project: false, team: false } },
        rules: rulesResult.status === "fulfilled" ? rulesResult.value : [],
        diagnosis: diagnosis.status === "fulfilled" ? diagnosis.value : null,
      },
      tasks: tasks.status === "fulfilled" ? tasks.value : undefined,
      team:
        members.status === "fulfilled"
          ? members.value
          : { members: [], currentUserId: "" },
    };
  }

  return <ProjectPageClient initialData={initialData} />;
}
