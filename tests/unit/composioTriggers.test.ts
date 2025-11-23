import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComposioTriggerService, type GmailNewMessagePayload } from "../../server/services/composioTriggers";
import type { IncomingTriggerPayload } from "@composio/core";

// Mock dependencies
vi.mock("../../server/services/claimProcessor", () => ({
  claimProcessor: {
    processNewThread: vi.fn(),
  },
}));

vi.mock("../../server/services/emailProcessor", () => ({
  emailProcessor: {
    fetchThread: vi.fn(),
  },
}));

describe("ComposioTriggerService", () => {
  let service: ComposioTriggerService;

  beforeEach(() => {
    service = new ComposioTriggerService();
    vi.clearAllMocks();
  });

  describe("Email Filtering (isClaimRelatedEmail)", () => {
    // Test through processGmailTriggerEvent which uses isClaimRelatedEmail internally
    const createMockMessage = (overrides: Partial<GmailNewMessagePayload>): GmailNewMessagePayload => ({
      threadId: "test-thread-123",
      subject: "",
      sender: "",
      ...overrides,
    });

    it("should detect Gladstone references in subject", async () => {
      const message = createMockMessage({
        subject: "RE: G/1457/25B - Survey Details",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);
      
      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      
      // Should not skip (meaning it passed the filter)
      expect(result.status).not.toBe("skipped");
    });

    it("should detect claim keywords in subject", async () => {
      const message = createMockMessage({
        subject: "New cargo damage claim notification",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).not.toBe("skipped");
    });

    it("should detect policy numbers in subject", async () => {
      const message = createMockMessage({
        subject: "Policy Number: 21-H0963406 - Claim Notification",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).not.toBe("skipped");
    });

    it("should detect emails from known domains", async () => {
      const message = createMockMessage({
        subject: "Random email",
        sender: "pallavi@gladstone.co.in",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).not.toBe("skipped");
    });

    it("should reject personal emails", async () => {
      const message = createMockMessage({
        subject: "Hey, want to grab lunch?",
        sender: "friend@gmail.com",
        threadId: "test-thread",
      });

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).toBe("skipped");
      expect(result.reason).toBe("Not a claim-related email");
    });

    it("should reject emails without claim indicators", async () => {
      const message = createMockMessage({
        subject: "Meeting tomorrow at 3pm",
        sender: "colleague@company.com",
        threadId: "test-thread",
      });

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).toBe("skipped");
    });

    it("should handle case-insensitive matching", async () => {
      const message = createMockMessage({
        subject: "CLAIM NOTIFICATION - Policy ABC123",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).not.toBe("skipped");
    });

    it("should detect survey-related emails", async () => {
      const message = createMockMessage({
        subject: "Survey appointment scheduled for next week",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).not.toBe("skipped");
    });

    it("should detect PLA-related emails", async () => {
      const message = createMockMessage({
        subject: "PLA report attached for review",
        threadId: "test-thread",
      });

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const result = await (service as any).processGmailTriggerEvent(message, { source: "test" });
      expect(result.status).not.toBe("skipped");
    });
  });

  describe("Payload Extraction (extractGmailPayloadFromTrigger)", () => {
    it("should extract threadId from payload.threadId", () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          threadId: "gmail-thread-456",
          messageId: "msg-789",
          subject: "Test Subject",
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const result = (service as any).extractGmailPayloadFromTrigger(incoming);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("gmail-thread-456");
      expect(result?.messageId).toBe("msg-789");
    });

    it("should extract threadId from payload.data.threadId", () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          data: {
            threadId: "nested-thread-456",
            thread_id: "alternative-thread-789",
          },
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const result = (service as any).extractGmailPayloadFromTrigger(incoming);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("nested-thread-456");
    });

    it("should extract threadId from thread_id (snake_case)", () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          thread_id: "snake-case-thread-123",
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const result = (service as any).extractGmailPayloadFromTrigger(incoming);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("snake-case-thread-123");
    });

    it("should extract from originalPayload if payload is missing", () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        originalPayload: {
          threadId: "original-thread-456",
          subject: "Original Subject",
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const result = (service as any).extractGmailPayloadFromTrigger(incoming);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("original-thread-456");
    });

    it("should return null if no threadId found", () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          someOtherField: "value",
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const result = (service as any).extractGmailPayloadFromTrigger(incoming);
      
      expect(result).toBeNull();
    });

    it("should handle deeply nested payload structures", () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          data: {
            threadId: "deeply-nested-thread",
          },
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const result = (service as any).extractGmailPayloadFromTrigger(incoming);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("deeply-nested-thread");
    });
  });

  describe("Payload Normalization (normalizeGmailPayload)", () => {
    it("should normalize camelCase threadId", () => {
      const candidate = {
        threadId: "camel-case-thread",
        messageId: "camel-case-msg",
        subject: "Test",
      };

      const result = (service as any).normalizeGmailPayload(candidate);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("camel-case-thread");
    });

    it("should normalize snake_case thread_id", () => {
      const candidate = {
        thread_id: "snake-case-thread",
        message_id: "snake-case-msg",
        subject: "Test",
      };

      const result = (service as any).normalizeGmailPayload(candidate);
      
      expect(result).not.toBeNull();
      expect(result?.threadId).toBe("snake-case-thread");
      expect(result?.messageId).toBe("snake-case-msg");
    });

    it("should prefer threadId over thread_id", () => {
      const candidate = {
        threadId: "camel-thread",
        thread_id: "snake-thread",
        subject: "Test",
      };

      const result = (service as any).normalizeGmailPayload(candidate);
      
      expect(result?.threadId).toBe("camel-thread");
    });

    it("should return null if no threadId found", () => {
      const candidate = {
        subject: "Test",
        otherField: "value",
      };

      const result = (service as any).normalizeGmailPayload(candidate);
      
      expect(result).toBeNull();
    });
  });

  describe("Dev Listener State Management", () => {
    it("should track listener active state", () => {
      expect(service.isDevListenerRunning()).toBe(false);
      
      // Manually set state for testing (since startDevListener requires Composio)
      (service as any).devListenerActive = true;
      expect(service.isDevListenerRunning()).toBe(true);
      
      (service as any).devListenerActive = false;
      expect(service.isDevListenerRunning()).toBe(false);
    });
  });

  describe("processGmailTriggerEvent - Source Labeling", () => {
    it("should label events from webhook source", async () => {
      const message: GmailNewMessagePayload = {
        threadId: "test-thread",
        subject: "Test claim",
      };

      // Mock console.log to capture source label
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await (service as any).processGmailTriggerEvent(message, {
        source: "webhook",
        triggerId: "test-id",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[webhook]"),
      );

      consoleSpy.mockRestore();
    });

    it("should label events from listener source", async () => {
      const message: GmailNewMessagePayload = {
        threadId: "test-thread",
        subject: "Test claim",
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await (service as any).processGmailTriggerEvent(message, {
        source: "listener",
        triggerId: "test-id",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[listener]"),
      );

      consoleSpy.mockRestore();
    });

    it("should default to webhook source if not specified", async () => {
      const message: GmailNewMessagePayload = {
        threadId: "test-thread",
        subject: "Test claim",
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await (service as any).processGmailTriggerEvent(message);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[webhook]"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("handleListenerPayload - Trigger Filtering", () => {
    it("should process GMAIL_NEW_GMAIL_MESSAGE triggers", async () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          threadId: "test-thread",
          subject: "Test claim - Policy ABC123",
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "GMAIL_NEW_GMAIL_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const processSpy = vi.spyOn(service as any, "processGmailTriggerEvent").mockResolvedValue({
        status: "success",
      });

      await (service as any).handleListenerPayload(incoming);

      expect(processSpy).toHaveBeenCalled();
      expect(processSpy.mock.calls[0][1].source).toBe("listener");

      processSpy.mockRestore();
    });

    it("should ignore non-Gmail triggers", async () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "SLACK_NEW_MESSAGE",
        toolkitSlug: "slack",
        userId: "user-123",
        payload: {},
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "slack",
          triggerSlug: "SLACK_NEW_MESSAGE",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const processSpy = vi.spyOn(service as any, "processGmailTriggerEvent");

      await (service as any).handleListenerPayload(incoming);

      expect(processSpy).not.toHaveBeenCalled();

      processSpy.mockRestore();
    });

    it("should handle case-insensitive trigger slug matching", async () => {
      const incoming: IncomingTriggerPayload = {
        id: "trigger-123",
        uuid: "uuid-123",
        triggerSlug: "gmail_new_gmail_message", // lowercase
        toolkitSlug: "gmail",
        userId: "user-123",
        payload: {
          threadId: "test-thread",
          subject: "Test claim - Policy ABC123",
        },
        metadata: {
          id: "meta-123",
          uuid: "meta-uuid",
          toolkitSlug: "gmail",
          triggerSlug: "gmail_new_gmail_message",
          triggerConfig: {},
          connectedAccount: {
            id: "acc-123",
            uuid: "acc-uuid",
            authConfigId: "auth-123",
            authConfigUUID: "auth-uuid",
            userId: "user-123",
            status: "ACTIVE",
          },
        },
      };

      const { claimProcessor } = await import("../../server/services/claimProcessor");
      vi.mocked(claimProcessor.processNewThread).mockResolvedValue(null);

      const processSpy = vi.spyOn(service as any, "processGmailTriggerEvent").mockResolvedValue({
        status: "success",
      });

      await (service as any).handleListenerPayload(incoming);

      expect(processSpy).toHaveBeenCalled();

      processSpy.mockRestore();
    });
  });
});

