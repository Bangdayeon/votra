import type { Project } from "@/components/project/ProjectsContext";

export function ProjectHeaderCard({ selected }: { selected: Project }) {
  const agentLabel = selected.agent?.toLowerCase();

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
        {agentLabel && (
          <span className="inline-flex items-center rounded-md bg-[#D4956B] px-2.5 py-1 text-xs font-medium text-white">
            {agentLabel}
          </span>
        )}
      </div>
      {selected.description && (
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {selected.description}
        </p>
      )}
    </div>
  );
}
