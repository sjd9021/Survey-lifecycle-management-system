import { StatusBadge } from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-6">
      <StatusBadge status="NOTIFIED" />
      <StatusBadge status="SURVEY_SCHEDULED" />
      <StatusBadge status="PLA_SENT" />
      <StatusBadge status="SURVEY_OVERDUE" />
      <StatusBadge status="PLA_OVERDUE" />
    </div>
  );
}
