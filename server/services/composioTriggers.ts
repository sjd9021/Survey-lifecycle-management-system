import {
  Composio,
  type IncomingTriggerPayload,
  type TriggerSubscribeParams,
} from "@composio/core";
import { claimProcessor } from "./claimProcessor";

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
  threadId?: string;
  messageId?: string;
  messageText?: string;
  sender?: string;
  subject?: string;
  snippet?: string;
}

export class ComposioTriggerService {
  private devListenerActive = false;

  /**
   * Create a Gmail new message trigger for a specific user
   * Note: User must already have a connected Gmail account in Composio
   */
  async setupGmailTrigger(userId: string, config?: {
    labels?: string[];
    interval?: number;
  }) {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    try {
      // Create Gmail new message trigger
      // Note: Uses polling with minimum 1-minute interval
      const trigger = await composio.triggers.create(
        userId,
        "GMAIL_NEW_GMAIL_MESSAGE",
        {
          triggerConfig: {
            interval: config?.interval || 1, // Polling interval in minutes (minimum 1)
            labelids: config?.labels?.[0] || "INBOX", // Gmail label ID
          },
        }
      );

      console.log(`✓ Gmail trigger created for user ${userId}:`, trigger);
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
    const response = await composio.triggers.listActive();
    const items = response?.items ?? [];

    return items.filter((item) => {
      const state = item.state as Record<string, unknown> | undefined;
      const stateUserId =
        (state?.userId as string | undefined) ||
        (state?.user_id as string | undefined) ||
        (state?.clientUniqueUserId as string | undefined);

      return stateUserId ? stateUserId === userId : true;
    });
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

    if (type.toUpperCase() === "GMAIL_NEW_GMAIL_MESSAGE") {
      return this.processGmailTriggerEvent(data as GmailNewMessagePayload, {
        source: "webhook",
        triggerId: log_id,
      });
    }

    return { status: "unhandled_trigger_type", type };
  }

  /**
   * Start Composio dev listener (WebSocket-based) for local development
   */
  async startDevListener(options: { userId?: string; filters?: TriggerSubscribeParams } = {}) {
    if (this.devListenerActive) {
      console.log("📡 Composio dev listener already running");
      return;
    }

    if (!process.env.COMPOSIO_API_KEY) {
      console.warn("⚠️  COMPOSIO_API_KEY not configured - cannot start dev listener");
      return;
    }

    const userId = options.userId ?? "replit";
    const filters: TriggerSubscribeParams = {
      ...(options.filters ?? {}),
      userId,
    };

    if (!filters.triggerSlug || filters.triggerSlug.length === 0) {
      filters.triggerSlug = ["GMAIL_NEW_GMAIL_MESSAGE"];
    }

    if (!filters.toolkits || filters.toolkits.length === 0) {
      filters.toolkits = ["gmail"];
    }

    try {
      await composio.triggers.subscribe(
        (incoming) => {
          void this.handleListenerPayload(incoming).catch((error) => {
            console.error("Listener event processing error:", error);
          });
        },
        filters,
      );

      this.devListenerActive = true;
      console.log(`🛰️  Composio dev listener started (userId=${userId})`);
    } catch (error) {
      console.error("Failed to start Composio dev listener:", error);
      throw error;
    }
  }

  /**
   * Stop Composio dev listener
   */
  async stopDevListener() {
    if (!this.devListenerActive) {
      return;
    }

    try {
      await composio.triggers.unsubscribe();
      console.log("🛑  Composio dev listener stopped");
    } catch (error) {
      console.error("Error stopping Composio dev listener:", error);
    } finally {
      this.devListenerActive = false;
    }
  }

  isDevListenerRunning() {
    return this.devListenerActive;
  }

  /**
   * Simple heuristic to detect claim-related emails
   */
  private isClaimRelatedEmail(message: GmailNewMessagePayload): boolean {
    const subject = (message.subject || "").toLowerCase();
    const sender = (message.sender || "").toLowerCase();
    
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
    
    if (knownDomains.some(domain => sender.includes(domain))) {
      return true;
    }
    
    return false;
  }

  private async processGmailTriggerEvent(
    messageData: GmailNewMessagePayload,
    context?: { source?: "webhook" | "listener"; triggerId?: string },
  ) {
    const sourceLabel = context?.source || "webhook";
    const threadId = messageData.threadId;
    const subject = messageData.subject || "";

    console.log(`[${sourceLabel}] Thread ID: ${threadId}`);
    console.log(`[${sourceLabel}] Subject: ${subject}`);

    if (!threadId) {
      console.log(`⚠️  No thread ID in ${sourceLabel} payload`);
      return { status: "error", reason: "Missing thread ID" };
    }

    const isClaimEmail = this.isClaimRelatedEmail(messageData);

    if (!isClaimEmail) {
      console.log(`⏭️  [${sourceLabel}] Skipping non-claim email: ${subject}`);
      return { status: "skipped", reason: "Not a claim-related email" };
    }

    try {
      const claim = await claimProcessor.processNewThread(threadId);

      if (claim) {
        console.log(`✅ Processed claim from ${sourceLabel}: ${claim.gladstoneRef}`);
        return { status: "success", claim };
      } else {
        console.log(`⚠️  No claim data extracted from thread ${threadId}`);
        return { status: "no_claim_found" };
      }
    } catch (error) {
      console.error(`Error processing Gmail ${sourceLabel}:`, error);
      throw error;
    }
  }

  private async handleListenerPayload(incoming: IncomingTriggerPayload) {
    const slug = incoming.triggerSlug?.toUpperCase() || "";

    if (slug !== "GMAIL_NEW_GMAIL_MESSAGE") {
      return;
    }

    const gmailPayload = this.extractGmailPayloadFromTrigger(incoming);

    if (!gmailPayload) {
      console.warn("⚠️  Unable to extract Gmail payload from trigger event");
      return;
    }

    await this.processGmailTriggerEvent(gmailPayload, {
      source: "listener",
      triggerId: incoming.id,
    });
  }

  private extractGmailPayloadFromTrigger(
    incoming: IncomingTriggerPayload,
  ): GmailNewMessagePayload | null {
    const candidates = this.collectPayloadCandidates(incoming);

    for (const candidate of candidates) {
      const normalized = this.normalizeGmailPayload(candidate);
      if (normalized?.threadId) {
        return normalized;
      }
    }

    return null;
  }

  private collectPayloadCandidates(
    incoming: IncomingTriggerPayload,
  ): Record<string, unknown>[] {
    const buckets: Record<string, unknown>[] = [];

    const pushCandidate = (value?: Record<string, unknown>) => {
      if (!value) return;
      buckets.push(value);

      const nestedPayload = (value as any).payload;
      if (nestedPayload && typeof nestedPayload === "object") {
        buckets.push(nestedPayload as Record<string, unknown>);
      }

      const nestedData = (value as any).data;
      if (nestedData && typeof nestedData === "object") {
        buckets.push(nestedData as Record<string, unknown>);
      }
    };

    if (incoming.payload && typeof incoming.payload === "object") {
      pushCandidate(incoming.payload as Record<string, unknown>);
    }

    if (incoming.originalPayload && typeof incoming.originalPayload === "object") {
      pushCandidate(incoming.originalPayload as Record<string, unknown>);
    }

    return buckets;
  }

  private normalizeGmailPayload(
    candidate?: Record<string, unknown>,
  ): GmailNewMessagePayload | null {
    if (!candidate) {
      return null;
    }

    const normalized: GmailNewMessagePayload = {
      ...(candidate as GmailNewMessagePayload),
      threadId:
        (candidate as GmailNewMessagePayload).threadId ||
        (candidate as { thread_id?: string }).thread_id,
      messageId:
        (candidate as GmailNewMessagePayload).messageId ||
        (candidate as { message_id?: string }).message_id,
    };

    return normalized.threadId ? normalized : null;
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhookSignature(
    signature: string,
    body: string
  ): boolean {
    const webhookSecret = process.env.COMPOSIO_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn("⚠️  COMPOSIO_WEBHOOK_SECRET not set - webhook signature verification disabled");
      return true; // Allow in development
    }

    if (!signature) {
      console.warn("⚠️  No signature provided in webhook");
      return false;
    }

    try {
      const crypto = require("crypto");
      // Generate expected signature using HMAC SHA256
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");

      // Compare signatures (constant-time comparison for security)
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }
}

export const composioTriggerService = new ComposioTriggerService();
