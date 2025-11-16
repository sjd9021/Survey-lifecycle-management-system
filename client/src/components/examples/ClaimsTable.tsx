import { ClaimsTable, type ClaimData } from "../ClaimsTable";

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
];

export default function ClaimsTableExample() {
  return (
    <div className="p-6">
      <ClaimsTable 
        claims={mockClaims} 
        onViewDetails={(id) => console.log("View details for claim:", id)} 
      />
    </div>
  );
}
