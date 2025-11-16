import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

export interface FilterOptions {
  branches: string[];
  insurers: string[];
  statuses: string[];
}

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onClearAll: () => void;
}

export function FilterPanel({ filters, onFilterChange, onClearAll }: FilterPanelProps) {
  const availableBranches = ["Mumbai", "Kolkata", "Chennai", "Delhi"];
  const availableInsurers = ["Marsh", "TKY Japan", "MSIG Singapore", "WK Webster", "CPIC"];
  const availableStatuses = ["NOTIFIED", "SURVEY_SCHEDULED", "PLA_SENT", "OVERDUE"];

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClearAll} data-testid="button-clear-filters">
          <X className="w-4 h-4 mr-1" />
          Clear All
        </Button>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-semibold mb-3 block">Branch</Label>
          <div className="space-y-2">
            {availableBranches.map((branch) => (
              <div key={branch} className="flex items-center gap-2">
                <Checkbox
                  id={`branch-${branch}`}
                  checked={filters.branches.includes(branch)}
                  onCheckedChange={() =>
                    onFilterChange({
                      ...filters,
                      branches: toggleArrayItem(filters.branches, branch),
                    })
                  }
                  data-testid={`checkbox-branch-${branch.toLowerCase()}`}
                />
                <label htmlFor={`branch-${branch}`} className="text-sm cursor-pointer">
                  {branch}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-semibold mb-3 block">Insurer</Label>
          <div className="space-y-2">
            {availableInsurers.map((insurer) => (
              <div key={insurer} className="flex items-center gap-2">
                <Checkbox
                  id={`insurer-${insurer}`}
                  checked={filters.insurers.includes(insurer)}
                  onCheckedChange={() =>
                    onFilterChange({
                      ...filters,
                      insurers: toggleArrayItem(filters.insurers, insurer),
                    })
                  }
                  data-testid={`checkbox-insurer-${insurer.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <label htmlFor={`insurer-${insurer}`} className="text-sm cursor-pointer">
                  {insurer}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-semibold mb-3 block">Status</Label>
          <div className="space-y-2">
            {availableStatuses.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() =>
                    onFilterChange({
                      ...filters,
                      statuses: toggleArrayItem(filters.statuses, status),
                    })
                  }
                  data-testid={`checkbox-status-${status.toLowerCase()}`}
                />
                <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                  {status.replace(/_/g, " ")}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
