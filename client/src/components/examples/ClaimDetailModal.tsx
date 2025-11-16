import { ClaimDetailModal, type ClaimDetails } from "../ClaimDetailModal";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const mockClaim: ClaimDetails = {
  id: "1",
  gladstoneRef: "G/1829/25G",
  clientRefs: ["BL MAEU260730677", "PI 9610232-2", "MENAC-193509"],
  notificationDate: new Date("2025-11-14T10:30:00"),
  surveyDate: new Date("2025-11-14T14:00:00"),
  surveyDateFixedAt: new Date("2025-11-12T16:57:00"),
  plaDate: new Date("2025-11-15T21:37:00"),
  status: "PLA_SENT",
  branch: "Mumbai",
  insurer: "Marsh",
  consignee: "Emirates Float Glass LLC",
  commodity: "Bronze Tinted Glass",
  emailThreads: [
    {
      id: "1",
      from: "n.jatia@gladstone.co.in",
      to: ["mumbai@gladstone.co.in"],
      date: new Date("2025-11-14T10:30:00"),
      subject: "Damage to 1 Box of Glass - PI 9610232-2",
      snippet: "Dilip, new survey near Surat. Please ensure notice of loss is properly served on the carriers...",
    },
    {
      id: "2",
      from: "mumbai@gladstone.co.in",
      to: ["ronnie@gladstone.co.in"],
      date: new Date("2025-11-15T21:37:00"),
      subject: "GLADSTONE Ref.: G/1829/25G (PLA)",
      snippet: "Pls find attached soft copy of PLA report no. G/1829/25G along with documents. Photographs will follow in next email.",
    },
  ],
};

export default function ClaimDetailModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)} data-testid="button-open-modal">
        Open Claim Details
      </Button>
      <ClaimDetailModal claim={mockClaim} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
