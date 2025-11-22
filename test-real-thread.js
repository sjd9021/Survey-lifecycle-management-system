import("@composio/core").then(async ({ Composio }) => {
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

  console.log("🔧 Testing with REAL email thread from your inbox\n");

  try {
    // First, find a real thread
    const listResult = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
      userId: "replit",
      arguments: {
        query: "CLAIM",
        max_results: 5,
        user_id: "me",
      },
      dangerouslySkipVersionCheck: true,
    });

    const messages = listResult?.data?.messages || [];
    if (messages.length === 0) {
      console.log("❌ No emails found");
      return;
    }

    const realThreadId = messages[0].threadId;
    console.log(`✅ Found real thread: ${realThreadId}`);
    console.log(`   Subject: ${messages[0].subject.substring(0, 80)}...\n`);

    // Now fetch this real thread
    console.log(`📧 Fetching full thread: ${realThreadId}\n`);
    
    const threadResult = await composio.tools.execute("GMAIL_FETCH_MESSAGE_BY_THREAD_ID", {
      userId: "replit",
      arguments: {
        thread_id: realThreadId,
        user_id: "me",
      },
      dangerouslySkipVersionCheck: true,
    });

    const threadMessages = threadResult?.data?.messages || [];
    console.log(`✅ Thread has ${threadMessages.length} messages\n`);
    
    threadMessages.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`);
      console.log(`  From: ${msg.sender}`);
      console.log(`  Subject: ${msg.subject.substring(0, 60)}...`);
      console.log(`  Has body: ${msg.snippet ? "Yes" : "No"}\n`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
});
