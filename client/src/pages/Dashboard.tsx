import { StatsCard } from "@/components/StatsCard";
import { ClaimsTable, type ClaimData } from "@/components/ClaimsTable";
import { ClaimDetailModal, type ClaimDetails } from "@/components/ClaimDetailModal";
import { FilterPanel, type FilterOptions } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export default function Dashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    branches: [],
    insurers: [],
    statuses: [],
  });

  const mockClaims: ClaimData[] = [
    {
      id: "1",
      gladstoneRef: "G/1829/25G",
      clientRefs: ["BL MAEU260730677", "PI 9610232-2", "MENAC-193509"],
      notificationDate: new Date("2025-11-14"),
      surveyDate: new Date("2025-11-14"),
      plaDate: new Date("2025-11-15"),
      status: "PLA_SENT",
      branch: "Mumbai",
      insurer: "Marsh",
      consignee: "Emirates Float Glass LLC",
    },
    {
      id: "2",
      gladstoneRef: "G/1812/25B",
      clientRefs: ["21-H0965963"],
      notificationDate: new Date("2025-11-11"),
      surveyDate: new Date("2025-11-12"),
      plaDate: null,
      status: "SURVEY_SCHEDULED",
      branch: "Mumbai",
      insurer: "TKY Japan",
      consignee: "Rishichem Distributors",
    },
    {
      id: "3",
      gladstoneRef: "G/1804/25B",
      clientRefs: ["A 301630641 CGO"],
      notificationDate: new Date("2025-11-07"),
      surveyDate: new Date("2025-11-10"),
      plaDate: null,
      status: "OVERDUE",
      branch: "Mumbai",
      insurer: "MSIG Singapore",
      consignee: "V3 Agencies",
    },
    {
      id: "4",
      gladstoneRef: "G/1796/25B",
      clientRefs: ["BL OOLU2763062180"],
      notificationDate: new Date("2025-11-06"),
      surveyDate: new Date("2025-11-10"),
      plaDate: null,
      status: "SURVEY_SCHEDULED",
      branch: "Mumbai",
      insurer: "WK Webster",
      consignee: "LG Electronics India",
    },
    {
      id: "5",
      gladstoneRef: "G/1802/25B",
      clientRefs: ["AQID61024225QAAASUSH"],
      notificationDate: new Date("2025-11-07"),
      surveyDate: new Date("2025-11-13"),
      plaDate: null,
      status: "SURVEY_SCHEDULED",
      branch: "Mumbai",
      insurer: "CPIC",
      consignee: "Marica Agronomics Pvt. Ltd",
    },
  ];

  const mockClaimDetail: ClaimDetails = {
    id: selectedClaimId || "",
    gladstoneRef: mockClaims.find((c) => c.id === selectedClaimId)?.gladstoneRef || "",
    clientRefs: mockClaims.find((c) => c.id === selectedClaimId)?.clientRefs || [],
    notificationDate: mockClaims.find((c) => c.id === selectedClaimId)?.notificationDate || null,
    surveyDate: mockClaims.find((c) => c.id === selectedClaimId)?.surveyDate || null,
    surveyDateFixedAt: new Date("2025-11-12T16:57:00"),
    plaDate: mockClaims.find((c) => c.id === selectedClaimId)?.plaDate || null,
    status: mockClaims.find((c) => c.id === selectedClaimId)?.status || "NOTIFIED",
    branch: mockClaims.find((c) => c.id === selectedClaimId)?.branch,
    insurer: mockClaims.find((c) => c.id === selectedClaimId)?.insurer,
    consignee: mockClaims.find((c) => c.id === selectedClaimId)?.consignee,
    commodity: "Bronze Tinted Glass",
    emailThreads: [
      {
        id: "1",
        from: "n.jatia@gladstone.co.in",
        to: ["mumbai@gladstone.co.in"],
        date: new Date("2025-11-14T10:30:00"),
        subject: "New survey notification",
        snippet: "Dilip, new survey near location. Please ensure notice of loss is properly served...",
      },
    ],
  };

  const stats = {
    total: mockClaims.length,
    scheduled: mockClaims.filter((c) => c.status === "SURVEY_SCHEDULED").length,
    plaSent: mockClaims.filter((c) => c.status === "PLA_SENT").length,
    overdue: mockClaims.filter((c) => c.status === "OVERDUE").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Total Claims" value={stats.total} trend={{ value: 12, direction: "up" }} />
        <StatsCard label="Survey Scheduled" value={stats.scheduled} />
        <StatsCard label="Overdue" value={stats.overdue} trend={{ value: 8, direction: "down" }} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Recent Claims</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" data-testid="button-open-filters">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent>
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              onClearAll={() => setFilters({ branches: [], insurers: [], statuses: [] })}
            />
          </SheetContent>
        </Sheet>
      </div>

      <ClaimsTable claims={mockClaims} onViewDetails={(id) => setSelectedClaimId(id)} />

      <ClaimDetailModal
        claim={selectedClaimId ? mockClaimDetail : null}
        open={!!selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
      />
    </div>
  );
}
