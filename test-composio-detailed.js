import("@composio/core").then(async ({ Composio }) => {
  console.log("🔧 Detailed Composio Diagnosis\n");
  
  const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

  try {
    console.log("Test 1: Fetch specific thread");
    console.log("ThreadID: 19a95c3dc348a816\n");
    
    const result = await composio.tools.execute("GMAIL_FETCH_MESSAGE_BY_THREAD_ID", {
      userId: "replit",
      arguments: {
        thread_id: "19a95c3dc348a816",
        user_id: "me",
      },
      dangerouslySkipVersionCheck: true,
    });

    console.log("Raw response:");
    console.log(JSON.stringify(result, null, 2));
    
    console.log("\n\nTest 2: List recent emails");
    const listResult = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
      userId: "replit",
      arguments: {
        query: "CLAIM",
        max_results: 5,
        user_id: "me",
      },
      dangerouslySkipVersionCheck: true,
    });
    
    console.log("Email list response:");
    console.log(JSON.stringify(listResult, null, 2));

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
});
