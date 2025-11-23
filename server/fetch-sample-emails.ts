import { Composio } from "@composio/core";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

type GmailMessageSummary = {
  id?: string;
  threadId?: string;
  snippet?: string;
};

type GmailMessagesResponse = {
  messages?: GmailMessageSummary[];
};

type GmailThreadResponse = {
  messages?: Array<{
    id?: string;
    from?: string;
    to?: string[] | string;
    date?: string;
    subject?: string;
    body?: string;
    snippet?: string;
  }>;
};

async function fetchRecentThreads() {
  try {
    console.log("🔍 Fetching recent Gmail threads...\n");

    const listResult = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
      userId: "replit",
      arguments: {
        query: "in:inbox newer_than:14d",
        max_results: 15,
        user_id: "me",
      },
      dangerouslySkipVersionCheck: true,
    });

    const listData = (listResult.data as GmailMessagesResponse) || {};
    const messages = Array.isArray(listData.messages) ? listData.messages : [];
    const seenThreads = new Set<string>();
    const threadIds: string[] = [];

    for (const msg of messages) {
      if (!msg.threadId || seenThreads.has(msg.threadId)) {
        continue;
      }
      seenThreads.add(msg.threadId);
      threadIds.push(msg.threadId);
    }

    console.log(`📧 Found ${threadIds.length} recent threads\n`);

    const sampleCount = Math.min(5, threadIds.length);
    for (let i = 0; i < sampleCount; i++) {
      const threadId = threadIds[i];
      console.log("=".repeat(80));
      console.log(`\n🧵 THREAD ${i + 1}/${sampleCount}`);
      console.log(`   Thread ID: ${threadId}\n`);

      const threadResult = await composio.tools.execute("GMAIL_FETCH_MESSAGE_BY_THREAD_ID", {
        userId: "replit",
        arguments: {
          thread_id: threadId,
          user_id: "me",
        },
        dangerouslySkipVersionCheck: true,
      });

      const threadData = (threadResult.data as GmailThreadResponse) || {};
      const threadMessages = Array.isArray(threadData.messages) ? threadData.messages : [];
      console.log(`   📨 ${threadMessages.length} message(s) in this thread\n`);

      threadMessages.forEach((msg, idx) => {
        console.log(`   --- Message ${idx + 1} ---`);
        console.log(`   From: ${msg.from || "Unknown"}`);
        const toField = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;
        console.log(`   To: ${toField || "Unknown"}`);
        console.log(`   Date: ${msg.date || "Unknown"}`);
        console.log(`   Subject: ${msg.subject || "No subject"}`);
        console.log(`   Body preview:\n`);
        const preview = (msg.body || msg.snippet || "")
          .slice(0, 600)
          .split("\n")
          .map((line) => `      ${line}`)
          .join("\n");
        console.log(preview);
        console.log(`\n`);
      });
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

fetchRecentThreads();
