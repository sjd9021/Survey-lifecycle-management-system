import { Composio } from "composio-core";
import { claimProcessor } from "./claimProcessor";
import { emailProcessor } from "./emailProcessor";

/**
 * Composio v3 SDK integration for Gmail triggers
 * Documentation: https://docs.composio.dev/docs/using-triggers
 */

// Initialize Composio client
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

export interface TriggerPayload {
  type: string;
  data: any;
  timestamp: number;
  log_id: string;
}

export interface GmailNewMessagePayload {
  message_id: string;
  thread_id: string;
  subject: string;
  from: string;
  to: string[];
  received_at: string;
  snippet: string;
}

export class ComposioTriggerService {
  /**
   * Create a Gmail new message trigger for a specific user
   */
  async setupGmailTrigger(userId: string, config?: {
    labels?: string[];
    from?: string;
    to?: string;
    subject?: string;
  }) {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    try {
      // Create Gmail new message trigger
      const trigger = await composio.triggers.create(
        userId,
        "GMAIL_NEW_MESSAGE_RECEIVED",
        {
          triggerConfig: config || {},
        }
      );

      console.log(`✓ Gmail trigger created for user ${userId}: ${trigger.trigger_id}`);
      return trigger;
    } catch (error) {
      console.error("Failed to create Gmail trigger:", error);
      throw error;
    }
  }

  /**
   * Get all active triggers for a user
   */
  async listTriggers(userId: string) {
    return await composio.triggers.list({ userId });
  }

  /**
   * Enable/disable a trigger
   */
  async toggleTrigger(triggerId: string, enabled: boolean) {
    if (enabled) {
      return await composio.triggers.enable(triggerId);
    } else {
      return await composio.triggers.disable(triggerId);
    }
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(triggerId: string) {
    return await composio.triggers.delete(triggerId);
  }

  /**
   * Handle incoming Gmail trigger webhook
   */
  async handleGmailWebhook(payload: TriggerPayload): Promise<any> {
    const { type, data, log_id } = payload;

    console.log(`📧 Gmail webhook received: ${type} (log_id: ${log_id})`);

    if (type === "GMAIL_NEW_MESSAGE_RECEIVED") {
      const messageData = data as GmailNewMessagePayload;
      
      // Check if this is a claim-related email (basic heuristic)
      const isClaimEmail = this.isClaimRelatedEmail(messageData);
      
      if (!isClaimEmail) {
        console.log(`⏭️  Skipping non-claim email: ${messageData.subject}`);
        return { status: "skipped", reason: "Not a claim-related email" };
      }

      // Fetch the full thread using Gmail API
      try {
        const threadData = await emailProcessor.fetchThread(messageData.thread_id);
        
        // Process the thread
        const claim = await claimProcessor.processEmailThread(threadData);
        
        if (claim) {
          console.log(`✅ Processed claim from webhook: ${claim.gladstoneRef}`);
          return { status: "success", claim };
        } else {
          console.log(`⚠️  No claim data extracted from thread ${messageData.thread_id}`);
          return { status: "no_claim_found" };
        }
      } catch (error) {
        console.error("Error processing Gmail webhook:", error);
        throw error;
      }
    }

    return { status: "unhandled_trigger_type", type };
  }

  /**
   * Simple heuristic to detect claim-related emails
   */
  private isClaimRelatedEmail(message: GmailNewMessagePayload): boolean {
    const subject = message.subject.toLowerCase();
    const from = message.from.toLowerCase();
    
    // Check for Gladstone references in subject
    if (subject.match(/g\/\d+\/\d+[a-z]/i)) {
      return true;
    }
    
    // Check for claim-related keywords
    const claimKeywords = [
      "claim", "survey", "pla", "loss", "damage", "insurance",
      "policy", "b/l", "bill of lading", "cargo", "appointment"
    ];
    
    if (claimKeywords.some(keyword => subject.includes(keyword))) {
      return true;
    }
    
    // Check if from known domains
    const knownDomains = [
      "@gladstone.co.in",
      "@tokiomarine",
      "@msig",
      "@marsh.com",
      "@cpic",
    ];
    
    if (knownDomains.some(domain => from.includes(domain))) {
      return true;
    }
    
    return false;
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhookSignature(
    signature: string,
    webhookId: string,
    timestamp: string,
    body: string
  ): boolean {
    const webhookSecret = process.env.COMPOSIO_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn("⚠️  COMPOSIO_WEBHOOK_SECRET not set - webhook signature verification disabled");
      return true; // Allow in development
    }

    if (!signature.startsWith("v1,")) {
      return false;
    }

    const receivedSignature = signature.substring(3);
    const signingString = `${webhookId}.${timestamp}.${body}`;
    
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signingString)
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );
  }
}

export const composioTriggerService = new ComposioTriggerService();
