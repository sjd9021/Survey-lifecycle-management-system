import { Badge } from "@/components/ui/badge";

export type ClaimStatus = "NOTIFIED" | "SURVEY_SCHEDULED" | "PLA_SENT" | "OVERDUE";

interface StatusBadgeProps {
  status: ClaimStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<ClaimStatus, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    NOTIFIED: { variant: "secondary", label: "Notified" },
    SURVEY_SCHEDULED: { variant: "default", label: "Survey Scheduled" },
    PLA_SENT: { variant: "outline", label: "PLA Sent" },
    OVERDUE: { variant: "destructive", label: "Overdue" },
  };

  const { variant, label } = variants[status];

  return (
    <Badge variant={variant} className="uppercase text-xs font-medium" data-testid={`badge-status-${status.toLowerCase()}`}>
      {label}
    </Badge>
  );
}
