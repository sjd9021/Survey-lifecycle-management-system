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
      const { thread } = req.body;
      
      if (!thread) {
        return res.status(400).json({ error: "Thread data required" });
      }

      const claim = await claimProcessor.processRawThread(thread);
      
      if (!claim) {
        return res.json({ message: "No claim data found in thread" });
      }

      res.json({ message: "Thread processed successfully", claim });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook endpoint for Composio Gmail triggers (v3 SDK)
  app.post("/api/webhook/composio", async (req, res) => {
    try {
      const signature = req.headers["webhook-signature"] as string;
      const webhookId = req.headers["webhook-id"] as string;
      const timestamp = req.headers["webhook-timestamp"] as string;

      // Verify webhook signature for security
      const { composioTriggerService } = await import("./services/composioTriggers");
      const bodyStr = JSON.stringify(req.body);
      
      if (!composioTriggerService.verifyWebhookSignature(signature, webhookId, timestamp, bodyStr)) {
        console.warn("⚠️  Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Handle the trigger event
      const result = await composioTriggerService.handleGmailWebhook(req.body);
      
      res.json({ status: "success", ...result });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Setup Gmail trigger for a user
  app.post("/api/triggers/gmail/setup", async (req, res) => {
    try {
      const { userId, config } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

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

  const httpServer = createServer(app);

  return httpServer;
}
