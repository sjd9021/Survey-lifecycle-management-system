import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaimProcessor } from "../../server/services/claimProcessor";

// Mock dependencies
vi.mock("../../server/storage", () => ({
  storage: {
    getAllClaims: vi.fn(),
    addPendingThread: vi.fn(),
    addThread: vi.fn(),
    getPendingThreadByThreadId: vi.fn(),
    deletePendingThread: vi.fn(),
    getAllPendingThreads: vi.fn(),
    upsertClaimByGladstoneRef: vi.fn(),
  },
}));

vi.mock("../../server/services/emailProcessor", () => ({
  emailProcessor: {
    fetchThread: vi.fn(),
    threadToJson: vi.fn(),
    fetchThreadsByPolicy: vi.fn(),
    threadsToJson: vi.fn(),
  },
}));

vi.mock("../../server/services/policyExtractor", () => ({
  policyExtractor: {
    extractPolicyNumber: vi.fn(),
  },
}));

vi.mock("../../server/services/claimExtractor", () => ({
  claimExtractor: {
    extractClaimData: vi.fn(),
    toInsertClaim: vi.fn(),
  },
}));

describe("ClaimProcessor", () => {
  let processor: ClaimProcessor;
  let storage: any;
  let emailProcessor: any;
  let policyExtractor: any;
  let claimExtractor: any;

  beforeEach(async () => {
    processor = new ClaimProcessor();
    storage = (await import("../../server/storage")).storage;
    emailProcessor = (await import("../../server/services/emailProcessor")).emailProcessor;
    policyExtractor = (await import("../../server/services/policyExtractor")).policyExtractor;
    claimExtractor = (await import("../../server/services/claimExtractor")).claimExtractor;
    vi.clearAllMocks();
  });

  describe("getStats", () => {
    it("should calculate statistics correctly", async () => {
      const mockClaims = [
        { id: "1", status: "NOTIFIED" },
        { id: "2", status: "NOTIFIED" },
        { id: "3", status: "SURVEY_SCHEDULED" },
        { id: "4", status: "SURVEY_SCHEDULED" },
        { id: "5", status: "SURVEY_SCHEDULED" },
        { id: "6", status: "PLA_SENT" },
        { id: "7", status: "WAITING_FOR_SURVEY_APPOINTMENT" },
        { id: "8", status: "SURVEY_OVERDUE" },
        { id: "9", status: "PLA_OVERDUE" },
      ];

      vi.mocked(storage.getAllClaims).mockResolvedValue(mockClaims as any);

      const stats = await processor.getStats();

      expect(stats.total).toBe(9);
      expect(stats.notified).toBe(2);
      expect(stats.waitingForSurvey).toBe(1);
      expect(stats.surveyScheduled).toBe(3);
      expect(stats.surveyOverdue).toBe(1);
      expect(stats.plaSent).toBe(1);
      expect(stats.plaOverdue).toBe(1);
    });

    it("should handle empty claims array", async () => {
      vi.mocked(storage.getAllClaims).mockResolvedValue([]);

      const stats = await processor.getStats();

      expect(stats.total).toBe(0);
      expect(stats.notified).toBe(0);
      expect(stats.waitingForSurvey).toBe(0);
      expect(stats.surveyScheduled).toBe(0);
      expect(stats.surveyOverdue).toBe(0);
      expect(stats.plaSent).toBe(0);
      expect(stats.plaOverdue).toBe(0);
    });

    it("should handle all status types", async () => {
      const allStatuses = [
        "NOTIFIED",
        "WAITING_FOR_SURVEY_APPOINTMENT",
        "SURVEY_SCHEDULED",
        "SURVEY_OVERDUE",
        "PLA_SENT",
        "PLA_OVERDUE",
      ];

      const mockClaims = allStatuses.map((status, idx) => ({
        id: `claim-${idx}`,
        status,
      }));

      vi.mocked(storage.getAllClaims).mockResolvedValue(mockClaims as any);

      const stats = await processor.getStats();

      expect(stats.total).toBe(6);
      expect(stats.notified).toBe(1);
      expect(stats.waitingForSurvey).toBe(1);
      expect(stats.surveyScheduled).toBe(1);
      expect(stats.surveyOverdue).toBe(1);
      expect(stats.plaSent).toBe(1);
      expect(stats.plaOverdue).toBe(1);
    });
  });

  describe("linkPendingThreads", () => {
    it("should link pending threads by policy number in subject", async () => {
      const policyNumber = "13901027002";
      const pendingThreads = [
        {
          threadId: "pending-1",
          subject: "Claim notification for Policy 13901027002",
          snippet: "Some text",
          consignee: null,
          commodity: null,
        },
        {
          threadId: "pending-2",
          subject: "Unrelated email",
          snippet: "No policy here",
          consignee: null,
          commodity: null,
        },
      ];

      const result = await (processor as any).linkPendingThreads(policyNumber, pendingThreads);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe("pending-1");
    });

    it("should link pending threads by policy number in snippet", async () => {
      const policyNumber = "21-H0963406";
      const pendingThreads = [
        {
          threadId: "pending-1",
          subject: "Initial notification",
          snippet: "Policy Number: 21-H0963406 - Please review",
          consignee: null,
          commodity: null,
        },
      ];

      const result = await (processor as any).linkPendingThreads(policyNumber, pendingThreads);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe("pending-1");
    });

    it("should handle case-insensitive matching", async () => {
      const policyNumber = "ABC123";
      const pendingThreads = [
        {
          threadId: "pending-1",
          subject: "Policy abc123 notification",
          snippet: "Some text",
          consignee: null,
          commodity: null,
        },
      ];

      const result = await (processor as any).linkPendingThreads(policyNumber, pendingThreads);

      expect(result).toHaveLength(1);
    });

    it("should return empty array if no matches", async () => {
      const policyNumber = "NONEXISTENT";
      const pendingThreads = [
        {
          threadId: "pending-1",
          subject: "Different policy 123456",
          snippet: "No match here",
          consignee: null,
          commodity: null,
        },
      ];

      const result = await (processor as any).linkPendingThreads(policyNumber, pendingThreads);

      expect(result).toHaveLength(0);
    });

    it("should return empty array if no pending threads", async () => {
      const result = await (processor as any).linkPendingThreads("ANY_POLICY", []);

      expect(result).toHaveLength(0);
    });

    it("should search across subject, snippet, consignee, and commodity", async () => {
      const policyNumber = "POLICY123";
      const pendingThreads = [
        {
          threadId: "pending-1",
          subject: "Some subject",
          snippet: "Some snippet",
          consignee: "Company with POLICY123",
          commodity: null,
        },
        {
          threadId: "pending-2",
          subject: "Another subject",
          snippet: "Another snippet",
          consignee: null,
          commodity: "POLICY123 cargo",
        },
      ];

      const result = await (processor as any).linkPendingThreads(policyNumber, pendingThreads);

      expect(result).toHaveLength(2);
    });

    it("should handle null/undefined fields gracefully", async () => {
      const policyNumber = "POLICY123";
      const pendingThreads = [
        {
          threadId: "pending-1",
          subject: null,
          snippet: undefined,
          consignee: null,
          commodity: null,
        },
        {
          threadId: "pending-2",
          subject: "Policy POLICY123 notification",
          snippet: null,
          consignee: null,
          commodity: null,
        },
      ];

      const result = await (processor as any).linkPendingThreads(policyNumber, pendingThreads);

      expect(result).toHaveLength(1);
      expect(result[0].threadId).toBe("pending-2");
    });
  });
});

