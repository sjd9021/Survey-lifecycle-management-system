import { describe, it, expect, beforeAll } from "vitest";
import { emailProcessor } from "../../server/services/emailProcessor";

describe("Composio Gmail Integration", () => {
  beforeAll(() => {
    // Ensure COMPOSIO_API_KEY is set
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not set - tests cannot run");
    }
  });

  describe("fetchThread", () => {
    it("should fetch a real Gmail thread using Composio", async () => {
      // Skip if no real thread ID available
      const testThreadId = process.env.TEST_THREAD_ID;
      if (!testThreadId) {
        console.log("⏭️  Skipping - no TEST_THREAD_ID env var set");
        return;
      }

      const thread = await emailProcessor.fetchThread(testThreadId);

      expect(thread).toBeDefined();
      expect(thread.threadId).toBe(testThreadId);
      expect(thread.messages).toBeInstanceOf(Array);
      expect(thread.messages.length).toBeGreaterThan(0);

      // Verify message structure
      const firstMsg = thread.messages[0];
      expect(firstMsg.from).toBeDefined();
      expect(firstMsg.subject).toBeDefined();
      expect(firstMsg.bodyText).toBeDefined();
      expect(firstMsg.date).toBeInstanceOf(Date);
    }, 30000);

    it("should handle non-existent thread gracefully", async () => {
      await expect(
        emailProcessor.fetchThread("non-existent-thread-id-12345")
      ).rejects.toThrow();
    });
  });

  describe("fetchThreadsByPolicy", () => {
    it("should search and fetch threads by policy number", async () => {
      // Use a known policy number from your test data
      const testPolicy = process.env.TEST_POLICY_NUMBER || "2525MCAE018956";

      const threads = await emailProcessor.fetchThreadsByPolicy(testPolicy);

      expect(threads).toBeInstanceOf(Array);
      
      if (threads.length > 0) {
        const firstThread = threads[0];
        expect(firstThread.threadId).toBeDefined();
        expect(firstThread.messages).toBeInstanceOf(Array);
        expect(firstThread.messages.length).toBeGreaterThan(0);
      }
    }, 60000);
  });

  describe("threadToJson", () => {
    it("should convert normalized thread to JSON string", () => {
      const mockThread = {
        threadId: "test-123",
        messages: [
          {
            from: "test@example.com",
            to: ["recipient@example.com"],
            subject: "Test Subject",
            date: new Date("2025-11-20T10:00:00Z"),
            bodyText: "Test body content",
          },
        ],
      };

      const json = emailProcessor.threadToJson(mockThread);
      const parsed = JSON.parse(json);

      expect(parsed.threadId).toBe("test-123");
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.messages[0].subject).toBe("Test Subject");
    });
  });

  describe("threadsToJson", () => {
    it("should convert multiple threads to aggregated JSON", () => {
      const mockThreads = [
        {
          threadId: "thread-1",
          subject: "First thread",
          messages: [
            {
              from: "sender1@example.com",
              to: ["recipient@example.com"],
              subject: "First thread",
              date: new Date("2025-11-20T10:00:00Z"),
              bodyText: "First message",
            },
          ],
        },
        {
          threadId: "thread-2",
          subject: "Second thread",
          messages: [
            {
              from: "sender2@example.com",
              to: ["recipient@example.com"],
              subject: "Second thread",
              date: new Date("2025-11-20T11:00:00Z"),
              bodyText: "Second message",
            },
          ],
        },
      ];

      const json = emailProcessor.threadsToJson(mockThreads);
      const parsed = JSON.parse(json);

      expect(parsed.threadCount).toBe(2);
      expect(parsed.threads).toHaveLength(2);
      expect(parsed.threads[0].threadId).toBe("thread-1");
      expect(parsed.threads[1].threadId).toBe("thread-2");
    });
  });
});
