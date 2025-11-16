import { StatsCard } from "@/components/StatsCard";
import { ClaimsTable, type ClaimData } from "@/components/ClaimsTable";
import { ClaimDetailModal, type ClaimDetails } from "@/components/ClaimDetailModal";
import { FilterPanel, type FilterOptions } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Claim } from "@shared/schema";
import type { ClaimStatus } from "@/components/StatusBadge";

export default function Dashboard() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    branches: [],
    insurers: [],
    statuses: [],
  });

  // Fetch claims from API
  const { data: claims = [], isLoading: claimsLoading } = useQuery<Claim[]>({
    queryKey: ["/api/claims"],
  });

  // Fetch stats from API
  const { data: stats = {
    total: 0,
    notified: 0,
    surveyScheduled: 0,
    plaSent: 0,
    overdue: 0
  }, isLoading: statsLoading } = useQuery<{
    total: number;
    notified: number;
    surveyScheduled: number;
    plaSent: number;
    overdue: number;
  }>({
    queryKey: ["/api/stats"],
  });

  // Fetch selected claim details
  const { data: selectedClaim } = useQuery<Claim>({
    queryKey: ["/api/claims", selectedClaimId],
    enabled: !!selectedClaimId,
  });

  // Convert database claims to table format
  const tableData: ClaimData[] = claims.map((claim) => ({
    id: claim.id,
    gladstoneRef: claim.gladstoneRef,
    policyNumber: claim.policyNumber,
    clientRefs: claim.clientRefs || [],
    notificationDate: claim.notificationReceivedAt ? new Date(claim.notificationReceivedAt) : null,
    surveyDate: claim.surveyDate ? new Date(claim.surveyDate) : null,
    plaDate: claim.plaSentToRonnieAt ? new Date(claim.plaSentToRonnieAt) : null,
    status: claim.status as ClaimStatus,
    branch: claim.branch || undefined,
    insurer: claim.insurer || undefined,
    consignee: claim.consignee || undefined,
  }));

  // Convert selected claim to detail format
  const claimDetail: ClaimDetails | null = selectedClaim
    ? {
        id: selectedClaim.id,
        gladstoneRef: selectedClaim.gladstoneRef,
        clientRefs: selectedClaim.clientRefs || [],
        notificationDate: selectedClaim.notificationReceivedAt
          ? new Date(selectedClaim.notificationReceivedAt)
          : null,
        surveyDate: selectedClaim.surveyDate ? new Date(selectedClaim.surveyDate) : null,
        surveyDateFixedAt: selectedClaim.surveyDateFixedAt
          ? new Date(selectedClaim.surveyDateFixedAt)
          : null,
        plaDate: selectedClaim.plaSentToRonnieAt ? new Date(selectedClaim.plaSentToRonnieAt) : null,
        status: selectedClaim.status as ClaimStatus,
        branch: selectedClaim.branch || undefined,
        insurer: selectedClaim.insurer || undefined,
        consignee: selectedClaim.consignee || undefined,
        commodity: selectedClaim.commodity || undefined,
        emailThreads: [], // TODO: Add email threads when available
      }
    : null;

  if (claimsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading claims...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Total Claims" value={stats.total} />
        <StatsCard label="Survey Scheduled" value={stats.surveyScheduled} />
        <StatsCard label="Overdue" value={stats.overdue} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {tableData.length === 0 ? "No Claims Yet" : "Recent Claims"}
        </h2>
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

      {tableData.length === 0 ? (
        <div className="border rounded-md p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No claims in the system yet. Process an email thread to get started.
          </p>
          <p className="text-sm text-muted-foreground">
            Use the <code className="bg-muted px-2 py-1 rounded">/api/process-thread</code> endpoint to
            process email threads.
          </p>
        </div>
      ) : (
        <ClaimsTable claims={tableData} onViewDetails={(id) => setSelectedClaimId(id)} />
      )}

      <ClaimDetailModal
        claim={claimDetail}
        open={!!selectedClaimId}
        onClose={() => setSelectedClaimId(null)}
      />
    </div>
  );
}
