import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";

export type ClaimStatus = 
  | "NOTIFIED" 
  | "WAITING_FOR_SURVEY_APPOINTMENT" 
  | "SURVEY_SCHEDULED" 
  | "SURVEY_OVERDUE" 
  | "PLA_SENT" 
  | "PLA_OVERDUE";

interface StatusBadgeProps {
  status: ClaimStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<ClaimStatus, { variant: "default" | "secondary" | "outline" | "destructive"; label: string; icon?: any }> = {
    NOTIFIED: { variant: "secondary", label: "Notified" },
    WAITING_FOR_SURVEY_APPOINTMENT: { variant: "secondary", label: "Awaiting Survey", icon: Clock },
    SURVEY_SCHEDULED: { variant: "default", label: "Survey Scheduled" },
    SURVEY_OVERDUE: { variant: "destructive", label: "Survey Overdue", icon: AlertCircle },
    PLA_SENT: { variant: "outline", label: "PLA Sent" },
    PLA_OVERDUE: { variant: "destructive", label: "PLA Overdue", icon: AlertCircle },
  };

  const statusConfig = variants[status] || { variant: "secondary" as const, label: status || "Unknown" };
  const { variant, label, icon: Icon } = statusConfig;
  const testId = status ? `badge-status-${String(status).toLowerCase()}` : "badge-status-unknown";

  return (
    <Badge variant={variant} className="uppercase text-xs font-medium gap-1" data-testid={testId}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </Badge>
  );
}
