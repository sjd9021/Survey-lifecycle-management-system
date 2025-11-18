import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { claimProcessor } from "./services/claimProcessor";
import { emailProcessor } from "./services/emailProcessor";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all claims
  app.get("/api/claims", async (req, res) => {
    try {
      const claims = await storage.getAllClaims();
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single claim by ID
  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await claimProcessor.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Process email thread manually (for testing)
  app.post("/api/process-thread", async (req, res) => {
    try {
      const { threadText } = req.body;
      
      if (!threadText) {
        return res.status(400).json({ error: "threadText required (string containing email thread content)" });
      }

      const claim = await claimProcessor.processManualThread(threadText);
      
      if (!claim) {
        return res.json({ message: "No claim data found in thread (no policy number or Gladstone ref)" });
      }

      res.json({ message: "Thread processed successfully", claim });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Process Gmail thread by threadId (for testing with real Gmail data)
  app.post("/api/process-gmail-thread", async (req, res) => {
    try {
      const { threadId } = req.body;
      
      if (!threadId) {
        return res.status(400).json({ error: "threadId required" });
      }

      const claim = await claimProcessor.processNewThread(threadId);
      
      if (!claim) {
        return res.json({ message: "No claim data found in thread (may be stored in pending_threads)" });
      }

      res.json({ message: "Gmail thread processed successfully", claim });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for Composio Gmail triggers (v3 SDK) - Updated Nov 18, 2025
  app.post("/api/webhook/composio", async (req, res) => {
    try {
      // Composio sends x-composio-signature header
      const signature = req.headers["x-composio-signature"] as string;
      
      // Log webhook receipt
      console.log("📨 Received Composio webhook");
      console.log("Headers:", Object.keys(req.headers).filter(h => h.includes('composio')));
      
      // Verify webhook signature for security (if configured)
      const { composioTriggerService } = await import("./services/composioTriggers");
      const bodyStr = JSON.stringify(req.body);
      
      // Skip signature verification if no secret is configured
      const webhookSecret = process.env.COMPOSIO_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        if (!composioTriggerService.verifyWebhookSignature(signature, bodyStr)) {
          console.warn("⚠️  Invalid webhook signature");
          return res.status(401).json({ error: "Invalid signature" });
        }
      }

      // Handle the trigger event
      const result = await composioTriggerService.handleGmailWebhook(req.body);
      
      res.json({ status: "success", ...result });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Setup Gmail trigger for a user (assumes Gmail account already connected in Composio)
  app.post("/api/triggers/gmail/setup", async (req, res) => {
    try {
      const { userId = "replit", config } = req.body;

      const { composioTriggerService } = await import("./services/composioTriggers");
      const trigger = await composioTriggerService.setupGmailTrigger(userId, config);

      res.json({ 
        message: "Gmail trigger created successfully",
        trigger,
        webhookUrl: "Configure this in Composio dashboard: POST /api/webhook/composio"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List triggers for a user
  app.get("/api/triggers/:userId", async (req, res) => {
    try {
      const { composioTriggerService } = await import("./services/composioTriggers");
      const triggers = await composioTriggerService.listTriggers(req.params.userId);
      res.json(triggers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual sync endpoint (future: requires Gmail OAuth setup)
  app.post("/api/sync/manual", async (req, res) => {
    try {
      // NOTE: This requires Gmail OAuth access token to list and fetch messages
      // To implement:
      // 1. Set up Gmail OAuth2 credentials
      // 2. Use emailProcessor.listMessages() with query filters
      // 3. Process each thread with claimProcessor
      
      res.json({ 
        message: "Manual sync endpoint ready. Gmail OAuth integration required.",
        note: "For testing, use /api/process-thread with email thread JSON data.",
        suggestion: "Process individual email threads by POSTing Gmail thread JSON to /api/process-thread"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fetch and process recent emails from Gmail via Composio
  app.post("/api/sync/fetch-recent", async (req, res) => {
    try {
      const { userId = "replit", query = "", maxResults = 20 } = req.body;

      console.log(`📧 Fetching up to ${maxResults} recent emails from Gmail...`);
      
      // Fetch recent messages using Composio
      const messages = await emailProcessor.listMessages(query, maxResults, userId);
      
      console.log(`✅ Found ${messages.length} messages`);
      
      if (messages.length === 0) {
        return res.json({ 
          message: "No messages found",
          processed: 0 
        });
      }

      // Extract unique thread IDs
      const threadIds = [...new Set(messages.map((msg: any) => msg.threadId))];
      console.log(`📂 Processing ${threadIds.length} unique threads...`);

      const results = [];
      let processedCount = 0;
      let skippedCount = 0;

      // Process each thread
      for (const threadId of threadIds) {
        try {
          console.log(`\n🔄 Fetching thread: ${threadId}`);
          const thread = await emailProcessor.fetchThread(threadId, userId);
          
          // Process the thread through claim extraction
          const claim = await claimProcessor.processEmailThread(thread);
          
          if (claim) {
            results.push({ threadId, claim });
            processedCount++;
            console.log(`✅ Processed claim: ${claim.gladstoneRef}`);
          } else {
            skippedCount++;
            console.log(`⏭️  Skipped (no claim data found)`);
          }
        } catch (error: any) {
          console.error(`❌ Error processing thread ${threadId}:`, error.message);
          skippedCount++;
        }
      }

      res.json({ 
        message: `Processed ${processedCount} claims from ${threadIds.length} threads`,
        processed: processedCount,
        skipped: skippedCount,
        total: threadIds.length,
        results
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
