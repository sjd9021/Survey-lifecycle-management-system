import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type ClaimStatus } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export interface ClaimData {
  id: string;
  gladstoneRef: string;
  clientRefs: string[];
  notificationDate: Date | null;
  surveyDate: Date | null;
  plaDate: Date | null;
  status: ClaimStatus;
  branch?: string;
  insurer?: string;
  consignee?: string;
}

interface ClaimsTableProps {
  claims: ClaimData[];
  onViewDetails: (claimId: string) => void;
}

export function ClaimsTable({ claims, onViewDetails }: ClaimsTableProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return format(date, "dd MMM yyyy");
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Gladstone Ref</TableHead>
            <TableHead className="font-semibold">Client Refs</TableHead>
            <TableHead className="font-semibold">Notification</TableHead>
            <TableHead className="font-semibold">Survey Date</TableHead>
            <TableHead className="font-semibold">PLA Date</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No claims found
              </TableCell>
            </TableRow>
          ) : (
            claims.map((claim) => (
              <TableRow key={claim.id} className="hover-elevate" data-testid={`row-claim-${claim.id}`}>
                <TableCell className="font-medium" data-testid={`text-gladstone-ref-${claim.id}`}>
                  {claim.gladstoneRef}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {claim.clientRefs.slice(0, 2).join(", ")}
                  {claim.clientRefs.length > 2 && ` +${claim.clientRefs.length - 2}`}
                </TableCell>
                <TableCell className="text-sm">{formatDate(claim.notificationDate)}</TableCell>
                <TableCell className="text-sm">{formatDate(claim.surveyDate)}</TableCell>
                <TableCell className="text-sm">{formatDate(claim.plaDate)}</TableCell>
                <TableCell>
                  <StatusBadge status={claim.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-actions-${claim.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(claim.id)} data-testid={`button-view-details-${claim.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
