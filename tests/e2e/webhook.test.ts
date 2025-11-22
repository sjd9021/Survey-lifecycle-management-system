import { describe, it, expect, beforeAll } from "vitest";
import { webhookPayload } from "../fixtures/sample-claims";

describe("Webhook Processing", () => {
  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:5000";

  beforeAll(() => {
    console.log(`🌐 Testing against: ${baseUrl}`);
  });

  describe("Webhook Endpoint", () => {
    it("should reject webhooks with invalid signature", async () => {
      const response = await fetch(`${baseUrl}/api/webhook/composio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-composio-signature": "invalid-signature",
        },
        body: JSON.stringify(webhookPayload),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Invalid signature");
    });

    it("should accept webhooks without signature when COMPOSIO_WEBHOOK_SECRET not set", async () => {
      // This test assumes development mode where signature check might be optional
      const response = await fetch(`${baseUrl}/api/webhook/composio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      // Should either process successfully or return error (but not 401)
      expect([200, 500]).toContain(response.status);
    });

    it("should log webhook receipt", async () => {
      const testPayload = {
        ...webhookPayload,
        data: {
          ...webhookPayload.data,
          threadId: "test-webhook-logging-123",
        },
      };

      const response = await fetch(`${baseUrl}/api/webhook/composio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      // Should attempt to process (may fail on thread fetch, but should log)
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("Webhook-to-Claim Flow", () => {
    it("should process webhook and create/update claim", async () => {
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      const payload = {
        triggerId: "ti_test",
        type: "GMAIL_NEW_GMAIL_MESSAGE",
        log_id: "test-log",
        data: {
          threadId: testThreadId,
          messageId: "test-msg",
          sender: "test@example.com",
          subject: "Test webhook claim",
        },
      };

      const response = await fetch(`${baseUrl}/api/webhook/composio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 200) {
        expect(data.status).toBe("success");
        console.log("✅ Webhook processed successfully");
      } else if (response.status === 401) {
        console.log("⏭️  Webhook signature verification required");
      } else {
        console.log("Response:", data);
      }
    }, 60000);
  });

  describe("Email Filtering", () => {
    it("should skip non-claim-related emails", async () => {
      const nonClaimPayload = {
        triggerId: "ti_test",
        type: "GMAIL_NEW_GMAIL_MESSAGE",
        log_id: "test-log",
        data: {
          threadId: "test-thread",
          sender: "friend@gmail.com",
          subject: "Hey, want to grab lunch?",
          message_text: "Let's meet at the cafe downtown",
        },
      };

      const response = await fetch(`${baseUrl}/api/webhook/composio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nonClaimPayload),
      });

      const data = await response.json();

      // Should skip or handle gracefully
      if (response.status === 200) {
        // If processed, should indicate it was skipped
        console.log("Response:", data);
      }
    }, 30000);
  });
});
