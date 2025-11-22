import("@composio/core").then(async ({ Composio }) => {
  console.log("🔧 Testing Composio Gmail Integration\n");
  
  // Check API key
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("❌ COMPOSIO_API_KEY not set");
    process.exit(1);
  }
  console.log("✅ COMPOSIO_API_KEY is set");

  try {
    const composio = new Composio({ apiKey });
    console.log("✅ Composio initialized\n");

    // Test 1: Check if we can list connected accounts
    console.log("📋 Step 1: Checking connected accounts...");
    try {
      const connections = await composio.getConnectedAccounts();
      console.log("Connected accounts:", JSON.stringify(connections, null, 2));
    } catch (e) {
      console.log("⚠️  Could not list connections:", e.message);
    }

    // Test 2: Try to fetch a Gmail thread
    console.log("\n📧 Step 2: Trying to fetch Gmail thread...");
    console.log("Using userId: 'replit'");
    console.log("Thread ID: '19a95c3dc348a816'\n");

    const result = await composio.tools.execute("GMAIL_FETCH_MESSAGE_BY_THREAD_ID", {
      userId: "replit",
      arguments: {
        thread_id: "19a95c3dc348a816",
        user_id: "me",
      },
      dangerouslySkipVersionCheck: true,
    });

    if (result?.data) {
      console.log("✅ SUCCESS! Got thread data");
      console.log("Messages:", result.data.messages?.length || 0);
    } else {
      console.log("⚠️  No data in response:", result);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", JSON.stringify(error, null, 2));
  }
});
