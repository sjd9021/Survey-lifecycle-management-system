import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: number;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}

export function StatsCard({ label, value, trend }: StatsCardProps) {
  return (
    <Card className="p-6" data-testid={`card-stats-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold" data-testid={`text-value-${label.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.direction === "up" ? "text-chart-3" : "text-chart-1"
            }`}>
              {trend.direction === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
