import { FilterPanel, type FilterOptions } from "../FilterPanel";
import { useState } from "react";

export default function FilterPanelExample() {
  const [filters, setFilters] = useState<FilterOptions>({
    branches: ["Mumbai"],
    insurers: [],
    statuses: ["NOTIFIED", "SURVEY_SCHEDULED"],
  });

  return (
    <div className="p-6 max-w-sm">
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        onClearAll={() => setFilters({ branches: [], insurers: [], statuses: [] })}
      />
    </div>
  );
}
