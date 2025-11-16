import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type ClaimStatus } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { X, Calendar, User, Building2, Package } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface EmailThread {
  id: string;
  from: string;
  to: string[];
  date: Date;
  subject: string;
  snippet: string;
}

export interface ClaimDetails {
  id: string;
  gladstoneRef: string;
  clientRefs: string[];
  notificationDate: Date | null;
  surveyDate: Date | null;
  surveyDateFixedAt: Date | null;
  plaDate: Date | null;
  status: ClaimStatus;
  branch?: string;
  insurer?: string;
  consignee?: string;
  commodity?: string;
  emailThreads?: EmailThread[];
}

interface ClaimDetailModalProps {
  claim: ClaimDetails | null;
  open: boolean;
  onClose: () => void;
}

export function ClaimDetailModal({ claim, open, onClose }: ClaimDetailModalProps) {
  if (!claim) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return "Not set";
    return format(date, "dd MMM yyyy, HH:mm");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-claim-details">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-semibold" data-testid="text-claim-ref">
                {claim.gladstoneRef}
              </DialogTitle>
              <StatusBadge status={claim.status} />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Dates</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Notification Received</p>
                    <p className="text-sm text-muted-foreground">{formatDate(claim.notificationDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Survey Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(claim.surveyDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Survey Fixed At</p>
                    <p className="text-sm text-muted-foreground">{formatDate(claim.surveyDateFixedAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">PLA Sent to Ronnie</p>
                    <p className="text-sm text-muted-foreground">{formatDate(claim.plaDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Metadata</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Branch</p>
                    <p className="text-sm text-muted-foreground">{claim.branch || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Insurer</p>
                    <p className="text-sm text-muted-foreground">{claim.insurer || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Consignee</p>
                    <p className="text-sm text-muted-foreground">{claim.consignee || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Commodity</p>
                    <p className="text-sm text-muted-foreground">{claim.commodity || "Not specified"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3">Reference Numbers</h3>
            <div className="flex flex-wrap gap-2">
              {claim.clientRefs.map((ref, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 bg-muted text-sm rounded-md font-mono"
                  data-testid={`text-client-ref-${idx}`}
                >
                  {ref}
                </div>
              ))}
            </div>
          </div>

          {claim.emailThreads && claim.emailThreads.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Email Threads</h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {claim.emailThreads.map((thread) => (
                    <AccordionItem key={thread.id} value={thread.id} className="border rounded-md px-4">
                      <AccordionTrigger className="hover:no-underline" data-testid={`button-email-thread-${thread.id}`}>
                        <div className="flex flex-col items-start gap-1 text-left">
                          <p className="text-sm font-medium">{thread.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            From: {thread.from} • {format(thread.date, "dd MMM yyyy, HH:mm")}
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          <div className="text-sm">
                            <span className="font-medium">To:</span> {thread.to.join(", ")}
                          </div>
                          <p className="text-sm text-muted-foreground">{thread.snippet}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} data-testid="button-close">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
