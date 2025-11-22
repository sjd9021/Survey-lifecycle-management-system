/**
 * Test fixtures for claim processing tests
 */

export const sampleGmailThread = {
  id: "test-thread-123",
  messages: [
    {
      id: "msg-1",
      threadId: "test-thread-123",
      payload: {
        headers: [
          { name: "From", value: "pallavi@gladstone.co.in" },
          { name: "To", value: "surveys@gladstone.co.in" },
          { name: "Subject", value: "MARINE CLAIM - Policy 2525MCAE018956" },
          { name: "Date", value: "Wed, 20 Nov 2025 09:51:51 +0000" },
        ],
        body: {
          data: Buffer.from(
            "Dear Team,\n\nWe have received a cargo damage claim notification.\n\nPolicy Number: 2525MCAE018956\nConsignee: 東方超捷\nRoute: Taichung to India\nReference: 25112000070\n\nPlease arrange for survey.\n\nRegards,\nPallavi"
          ).toString("base64"),
        },
      },
      snippet: "We have received a cargo damage claim notification...",
    },
  ],
};

export const expectedClaimExtraction = {
  policyNumber: "2525MCAE018956",
  clientRefs: ["25112000070"],
  consignee: "東方超捷",
  commodity: "cargo damage",
  status: "NOTIFIED",
};

export const multiThreadPolicy = {
  policyNumber: "TEST-POLICY-001",
  threads: [
    {
      id: "thread-1",
      subject: "Initial notification - Policy TEST-POLICY-001",
      messages: [
        {
          from: "client@example.com",
          subject: "Claim notification",
          body: "Policy: TEST-POLICY-001, Damage reported",
          date: "2025-11-18T10:00:00Z",
        },
      ],
    },
    {
      id: "thread-2",
      subject: "Survey scheduled - Policy TEST-POLICY-001",
      messages: [
        {
          from: "surveys@gladstone.co.in",
          subject: "RE: Claim notification",
          body: "Survey scheduled for 2025-11-22 at 10:00 AM",
          date: "2025-11-19T14:00:00Z",
        },
      ],
    },
  ],
};

export const webhookPayload = {
  triggerId: "ti_vKFpBMVsawA8",
  type: "GMAIL_NEW_GMAIL_MESSAGE",
  log_id: "test-log-123",
  data: {
    threadId: "test-thread-456",
    messageId: "msg-456",
    sender: "test@example.com",
    subject: "Test claim - Policy ABC123",
    message_text: "Test message body",
  },
};
