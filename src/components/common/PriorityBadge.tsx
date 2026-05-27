type Priority = "critical" | "high" | "medium" | "low";

const LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const STYLES: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`rounded-full px-2 h-5 flex items-center text-xs font-medium ${STYLES[priority]}`}>
      {LABELS[priority]}
    </span>
  );
}
