import { describe, it, expect } from "vitest";
import { ClaimExtractor, type ExtractedClaimData } from "../../server/services/claimExtractor";
import type { InsertClaim } from "@shared/schema";

describe("ClaimExtractor", () => {
  const extractor = new ClaimExtractor();

  describe("toInsertClaim", () => {
    it("should convert ExtractedClaimData to InsertClaim format", () => {
      const extracted: ExtractedClaimData = {
        gladstoneRef: "G/1829/25G",
        policyNumber: "13901027002",
        clientRefs: ["BL MAEU260730677", "PI 9610232-2"],
        notificationReceivedAt: "2025-11-14T10:00:00Z",
        surveyDate: "2025-11-20T14:00:00Z",
        surveyDateFixedAt: "2025-11-15T09:00:00Z",
        plaForwardedInternallyAt: "2025-11-21T16:00:00Z",
        branch: "Mumbai",
        insurer: "Marsh",
        consignee: "Emirates Float Glass LLC",
        commodity: "Glass",
        summary: "Test summary",
        status: "PLA_SENT",
      };

      const result = extractor.toInsertClaim(extracted);

      expect(result.gladstoneRef).toBe("G/1829/25G");
      expect(result.policyNumber).toBe("13901027002");
      expect(result.clientRefs).toEqual(["BL MAEU260730677", "PI 9610232-2"]);
      expect(result.branch).toBe("Mumbai");
      expect(result.insurer).toBe("Marsh");
      expect(result.consignee).toBe("Emirates Float Glass LLC");
      expect(result.commodity).toBe("Glass");
      expect(result.summary).toBe("Test summary");
      expect(result.status).toBe("PLA_SENT");
      expect(result.notificationReceivedAt).toBeInstanceOf(Date);
      expect(result.surveyDate).toBeInstanceOf(Date);
      expect(result.surveyDateFixedAt).toBeInstanceOf(Date);
      expect(result.plaForwardedInternallyAt).toBeInstanceOf(Date);
    });

    it("should handle null dates", () => {
      const extracted: ExtractedClaimData = {
        gladstoneRef: null,
        policyNumber: "123456",
        clientRefs: [],
        notificationReceivedAt: null,
        surveyDate: null,
        surveyDateFixedAt: null,
        plaForwardedInternallyAt: null,
        branch: null,
        insurer: null,
        consignee: null,
        commodity: null,
        summary: null,
        status: "NOTIFIED",
      };

      const result = extractor.toInsertClaim(extracted);

      expect(result.notificationReceivedAt).toBeNull();
      expect(result.surveyDate).toBeNull();
      expect(result.surveyDateFixedAt).toBeNull();
      expect(result.plaForwardedInternallyAt).toBeNull();
      expect(result.branch).toBeNull();
      expect(result.insurer).toBeNull();
      expect(result.consignee).toBeNull();
      expect(result.commodity).toBeNull();
      expect(result.summary).toBeNull();
    });

    it("should convert ISO date strings to Date objects", () => {
      const extracted: ExtractedClaimData = {
        gladstoneRef: null,
        policyNumber: "123456",
        clientRefs: [],
        notificationReceivedAt: "2025-11-14T10:00:00Z",
        surveyDate: "2025-11-20T14:00:00Z",
        surveyDateFixedAt: null,
        plaForwardedInternallyAt: null,
        branch: null,
        insurer: null,
        consignee: null,
        commodity: null,
        summary: null,
        status: "NOTIFIED",
      };

      const result = extractor.toInsertClaim(extracted);

      expect(result.notificationReceivedAt).toBeInstanceOf(Date);
      expect(result.notificationReceivedAt?.toISOString()).toBe("2025-11-14T10:00:00.000Z");
      expect(result.surveyDate).toBeInstanceOf(Date);
      expect(result.surveyDate?.toISOString()).toBe("2025-11-20T14:00:00.000Z");
    });

    it("should preserve all status values", () => {
      const statuses: ExtractedClaimData["status"][] = [
        "NOTIFIED",
        "WAITING_FOR_SURVEY_APPOINTMENT",
        "SURVEY_SCHEDULED",
        "SURVEY_OVERDUE",
        "PLA_SENT",
        "PLA_OVERDUE",
      ];

      statuses.forEach((status) => {
        const extracted: ExtractedClaimData = {
          gladstoneRef: null,
          policyNumber: "123456",
          clientRefs: [],
          notificationReceivedAt: null,
          surveyDate: null,
          surveyDateFixedAt: null,
          plaForwardedInternallyAt: null,
          branch: null,
          insurer: null,
          consignee: null,
          commodity: null,
          summary: null,
          status,
        };

        const result = extractor.toInsertClaim(extracted);
        expect(result.status).toBe(status);
      });
    });

    it("should handle empty clientRefs array", () => {
      const extracted: ExtractedClaimData = {
        gladstoneRef: null,
        policyNumber: "123456",
        clientRefs: [],
        notificationReceivedAt: null,
        surveyDate: null,
        surveyDateFixedAt: null,
        plaForwardedInternallyAt: null,
        branch: null,
        insurer: null,
        consignee: null,
        commodity: null,
        summary: null,
        status: "NOTIFIED",
      };

      const result = extractor.toInsertClaim(extracted);
      expect(result.clientRefs).toEqual([]);
    });

    it("should handle multiple client references", () => {
      const extracted: ExtractedClaimData = {
        gladstoneRef: null,
        policyNumber: "123456",
        clientRefs: ["BL123", "PI456", "REF789"],
        notificationReceivedAt: null,
        surveyDate: null,
        surveyDateFixedAt: null,
        plaForwardedInternallyAt: null,
        branch: null,
        insurer: null,
        consignee: null,
        commodity: null,
        summary: null,
        status: "NOTIFIED",
      };

      const result = extractor.toInsertClaim(extracted);
      expect(result.clientRefs).toEqual(["BL123", "PI456", "REF789"]);
    });
  });
});

