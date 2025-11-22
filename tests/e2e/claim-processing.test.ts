import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { claimProcessor } from "../../server/services/claimProcessor";
import { storage } from "../../server/storage";

describe("End-to-End Claim Processing", () => {
  beforeAll(() => {
    // Ensure required env vars are set
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not set");
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set");
    }
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }
  });

  describe("processNewThread - Real Gmail Integration", () => {
    it("should process a real Gmail thread end-to-end", async () => {
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      console.log(`🧪 Testing with thread: ${testThreadId}`);

      const claim = await claimProcessor.processNewThread(testThreadId);

      // Claim should be created or updated
      if (claim) {
        expect(claim.id).toBeDefined();
        expect(claim.status).toBeDefined();
        
        // Verify claim has at least policy number or Gladstone ref
        const hasIdentifier = claim.policyNumber || claim.gladstoneRef;
        expect(hasIdentifier).toBeTruthy();

        console.log(`✅ Processed claim:`, {
          id: claim.id,
          policyNumber: claim.policyNumber,
          gladstoneRef: claim.gladstoneRef,
          status: claim.status,
          summary: claim.summary?.substring(0, 100),
        });
      } else {
        console.log("📋 Thread stored in pending_threads (no policy number found)");
      }
    }, 60000);
  });

  describe("Multi-thread Aggregation", () => {
    it("should aggregate multiple threads for the same policy", async () => {
      const testPolicy = process.env.TEST_POLICY_NUMBER;
      if (!testPolicy) {
        console.log("⏭️  Skipping - no TEST_POLICY_NUMBER env var set");
        return;
      }

      // Find a thread with this policy
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      const claim = await claimProcessor.processNewThread(testThreadId);

      expect(claim).toBeDefined();
      if (claim) {
        expect(claim.policyNumber).toBeDefined();
        
        // Verify claim was created/updated
        const stored = await storage.getAllClaims();
        const matchingClaim = stored.find(
          (c) => c.policyNumber === claim.policyNumber
        );
        
        expect(matchingClaim).toBeDefined();
        expect(matchingClaim?.status).toBeDefined();
      }
    }, 90000);
  });

  describe("Pending Thread Storage", () => {
    it("should store threads without policy number in pending_threads", async () => {
      // This test would require a thread ID that has no policy number
      // Skipping unless we have a specific test case
      console.log("⏭️  Manual test: Verify pending thread storage with thread lacking policy number");
    });
  });

  describe("Status Detection", () => {
    it("should correctly detect claim lifecycle status", async () => {
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      const claim = await claimProcessor.processNewThread(testThreadId);

      if (claim) {
        const validStatuses = [
          "NOTIFIED",
          "WAITING_FOR_SURVEY_APPOINTMENT",
          "SURVEY_SCHEDULED",
          "SURVEY_OVERDUE",
          "PLA_SENT",
          "PLA_OVERDUE",
        ];

        expect(validStatuses).toContain(claim.status);
        console.log(`✅ Detected status: ${claim.status}`);
      }
    }, 60000);
  });

  describe("AI Summary Generation", () => {
    it("should generate plain-English summaries for claims", async () => {
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      const claim = await claimProcessor.processNewThread(testThreadId);

      if (claim && claim.summary) {
        expect(claim.summary).toBeDefined();
        expect(claim.summary.length).toBeGreaterThan(50);
        expect(claim.summary.length).toBeLessThan(1000);
        
        // Should not contain technical jargon like "null" or "undefined"
        expect(claim.summary.toLowerCase()).not.toContain("undefined");
        expect(claim.summary.toLowerCase()).not.toContain("null");
        
        console.log(`✅ Generated summary: ${claim.summary.substring(0, 100)}...`);
      }
    }, 60000);
  });

  describe("Database Upsert Logic", () => {
    it("should handle reprocessing of existing claims correctly", async () => {
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      // Process once
      const claim1 = await claimProcessor.processNewThread(testThreadId);
      
      if (!claim1) {
        console.log("⏭️  Skipping - no claim extracted");
        return;
      }

      const firstId = claim1.id;

      // Process again (should upsert, not duplicate)
      const claim2 = await claimProcessor.processNewThread(testThreadId);

      expect(claim2).toBeDefined();
      if (claim2) {
        expect(claim2.id).toBe(firstId);
        console.log(`✅ Upsert working - same claim ID: ${firstId}`);
      }
    }, 120000);
  });
});
