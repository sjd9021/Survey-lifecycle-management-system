import { describe, it, expect } from "vitest";
import { EmailProcessor, type NormalizedThread } from "../../server/services/emailProcessor";

describe("EmailProcessor", () => {
  const processor = new EmailProcessor();

  describe("normalizeThread", () => {
    it("should normalize simplified test format", () => {
      const testData = {
        messages: [
          {
            from: "test@example.com",
            to: "recipient@example.com",
            subject: "Test Subject",
            bodyText: "Test body content",
            date: "2025-11-20T10:00:00Z",
          },
        ],
      };

      const result = processor.normalizeThread(testData, "test-thread-123");

      expect(result.threadId).toBe("test-thread-123");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].from).toBe("test@example.com");
      expect(result.messages[0].subject).toBe("Test Subject");
      expect(result.messages[0].bodyText).toBe("Test body content");
    });

    it("should normalize Gmail API format", () => {
      const gmailData = {
        messages: [
          {
            payload: {
              headers: [
                { name: "From", value: "sender@example.com" },
                { name: "To", value: "recipient@example.com" },
                { name: "Subject", value: "Gmail Subject" },
                { name: "Date", value: "Wed, 20 Nov 2025 10:00:00 +0000" },
              ],
              body: {
                data: Buffer.from("Gmail body content").toString("base64"),
              },
            },
            internalDate: "1732094400000",
          },
        ],
      };

      const result = processor.normalizeThread(gmailData, "gmail-thread-456");

      expect(result.threadId).toBe("gmail-thread-456");
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].from).toBe("sender@example.com");
      expect(result.messages[0].subject).toBe("Gmail Subject");
      expect(result.messages[0].bodyText).toBe("Gmail body content");
    });

    it("should handle array of recipients", () => {
      const testData = {
        messages: [
          {
            from: "test@example.com",
            to: ["recipient1@example.com", "recipient2@example.com"],
            subject: "Test",
            bodyText: "Body",
            date: "2025-11-20T10:00:00Z",
          },
        ],
      };

      const result = processor.normalizeThread(testData, "test-thread");

      expect(result.messages[0].to).toEqual([
        "recipient1@example.com",
        "recipient2@example.com",
      ]);
    });

    it("should handle CC recipients", () => {
      const testData = {
        messages: [
          {
            from: "test@example.com",
            to: "recipient@example.com",
            cc: "cc@example.com",
            subject: "Test",
            bodyText: "Body",
            date: "2025-11-20T10:00:00Z",
          },
        ],
      };

      const result = processor.normalizeThread(testData, "test-thread");

      expect(result.messages[0].cc).toEqual(["cc@example.com"]);
    });

    it("should handle comma-separated CC", () => {
      const testData = {
        messages: [
          {
            from: "test@example.com",
            to: "recipient@example.com",
            cc: "cc1@example.com, cc2@example.com",
            subject: "Test",
            bodyText: "Body",
            date: "2025-11-20T10:00:00Z",
          },
        ],
      };

      const result = processor.normalizeThread(testData, "test-thread");

      expect(result.messages[0].cc).toEqual([
        "cc1@example.com",
        "cc2@example.com",
      ]);
    });

    it("should throw error if messages array missing", () => {
      const invalidData = {};

      expect(() => {
        processor.normalizeThread(invalidData, "test-thread");
      }).toThrow("Invalid thread data structure - no messages array");
    });

    it("should throw error if messages is not an array", () => {
      const invalidData = {
        messages: "not-an-array",
      };

      expect(() => {
        processor.normalizeThread(invalidData, "test-thread");
      }).toThrow("Invalid thread data structure - messages is not an array");
    });

    it("should extract attachment names", () => {
      const gmailData = {
        messages: [
          {
            payload: {
              headers: [
                { name: "From", value: "sender@example.com" },
                { name: "To", value: "recipient@example.com" },
                { name: "Subject", value: "Test" },
                { name: "Date", value: "Wed, 20 Nov 2025 10:00:00 +0000" },
              ],
              body: {
                data: Buffer.from("Body").toString("base64"),
              },
              parts: [
                {
                  filename: "attachment.pdf",
                  mimeType: "application/pdf",
                },
                {
                  filename: "image.jpg",
                  mimeType: "image/jpeg",
                },
              ],
            },
            internalDate: "1732094400000",
          },
        ],
      };

      const result = processor.normalizeThread(gmailData, "test-thread");

      expect(result.messages[0].attachmentNames).toEqual([
        "attachment.pdf",
        "image.jpg",
      ]);
    });
  });

  describe("threadToJson", () => {
    it("should convert NormalizedThread to JSON string", () => {
      const thread: NormalizedThread = {
        threadId: "test-123",
        messages: [
          {
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test Subject",
            date: new Date("2025-11-20T10:00:00Z"),
            bodyText: "Test body",
          },
        ],
      };

      const json = processor.threadToJson(thread);
      const parsed = JSON.parse(json);

      expect(parsed.threadId).toBe("test-123");
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.messages[0].from).toBe("sender@example.com");
      expect(parsed.messages[0].subject).toBe("Test Subject");
    });

    it("should handle Date objects in messages", () => {
      const thread: NormalizedThread = {
        threadId: "test-123",
        messages: [
          {
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
            date: new Date("2025-11-20T10:00:00Z"),
            bodyText: "Body",
          },
        ],
      };

      const json = processor.threadToJson(thread);
      const parsed = JSON.parse(json);

      expect(parsed.messages[0].date).toBe("2025-11-20T10:00:00.000Z");
    });
  });

  describe("threadsToJson", () => {
    it("should convert multiple threads to aggregated JSON", () => {
      const threads: any[] = [
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

      const json = processor.threadsToJson(threads);
      const parsed = JSON.parse(json);

      expect(parsed.threadCount).toBe(2);
      expect(parsed.threads).toHaveLength(2);
      expect(parsed.threads[0].threadId).toBe("thread-1");
      expect(parsed.threads[1].threadId).toBe("thread-2");
      expect(parsed.threads[0].messageCount).toBe(1);
      expect(parsed.threads[1].messageCount).toBe(1);
    });

    it("should handle empty threads array", () => {
      const json = processor.threadsToJson([]);
      const parsed = JSON.parse(json);

      expect(parsed.threadCount).toBe(0);
      expect(parsed.threads).toHaveLength(0);
    });

    it("should handle threads without messages array", () => {
      const threads: any[] = [
        {
          threadId: "thread-1",
          someOtherField: "value",
        },
      ];

      const json = processor.threadsToJson(threads);
      const parsed = JSON.parse(json);

      expect(parsed.threadCount).toBe(1);
      expect(parsed.threads[0].threadId).toBe("thread-1");
    });
  });
});

