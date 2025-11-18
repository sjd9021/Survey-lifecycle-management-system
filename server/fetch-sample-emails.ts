import { Composio } from "@composio/core";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

async function fetchRecentThreads() {
  try {
    console.log("🔍 Fetching recent Gmail threads...\n");
    
    const result = await composio.tools.execute({
      toolSlug: "GMAIL_LIST_THREADS",
      userId: "replit",
      arguments: {
        maxResults: 15,
        q: "in:inbox newer_than:14d"
      },
      dangerouslySkipVersionCheck: true
    });

    const threads = result.data?.threads || [];
    console.log(`📧 Found ${threads.length} recent threads\n`);

    // Fetch details for first 5 threads
    for (let i = 0; i < Math.min(5, threads.length); i++) {
      const thread = threads[i];
      console.log("=".repeat(80));
      console.log(`\n🧵 THREAD ${i + 1}/${Math.min(5, threads.length)}`);
      console.log(`   Thread ID: ${thread.id}\n`);
      
      const threadData = await composio.tools.execute({
        toolSlug: "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
        userId: "replit",
        arguments: { threadId: thread.id },
        dangerouslySkipVersionCheck: true
      });

      const messages = threadData.data?.messages || [];
      console.log(`   📨 ${messages.length} message(s) in this thread\n`);
      
      messages.forEach((msg, idx) => {
        console.log(`   --- Message ${idx + 1} ---`);
        console.log(`   From: ${msg.from}`);
        console.log(`   To: ${msg.to?.join?.(', ') || msg.to}`);
        console.log(`   Date: ${msg.date}`);
        console.log(`   Subject: ${msg.subject}`);
        console.log(`   Body preview:\n`);
        const preview = (msg.body || msg.snippet || '')
          .slice(0, 600)
          .split('\n')
          .map(line => `      ${line}`)
          .join('\n');
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
