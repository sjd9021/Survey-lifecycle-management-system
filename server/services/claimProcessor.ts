import { storage } from "../storage";
import { emailProcessor, type NormalizedThread } from "./emailProcessor";
import { claimExtractor } from "./claimExtractor";
import type { Claim } from "@shared/schema";

export class ClaimProcessor {
  /**
   * Process an email thread and upsert claim data
   */
  async processEmailThread(thread: NormalizedThread): Promise<Claim | null> {
    try {
      // Convert thread to compact JSON for LLM
      const threadJson = emailProcessor.compactThreadForLLM(thread);

      // Extract claim data using OpenAI
      const extracted = await claimExtractor.extractClaimData(threadJson);

      if (!extracted) {
        console.log("No claim data found in thread", thread.threadId);
        return null;
      }

      // Convert to InsertClaim format
      const claimData = claimExtractor.toInsertClaim(extracted);

      // Add latest email metadata
      const latestMessage = thread.messages[thread.messages.length - 1];
      claimData.latestEmailDate = latestMessage.date;
      claimData.latestEmailSnippet = latestMessage.bodyText.substring(0, 200);

      // Upsert claim in database
      const claim = await storage.upsertClaimByGladstoneRef(claimData);

      console.log(`✓ Processed claim: ${claim.gladstoneRef} (status: ${claim.status})`);
      return claim;
    } catch (error) {
      console.error("Error processing thread:", error);
      throw error;
    }
  }

  /**
   * Process a raw email thread structure (for manual testing)
   */
  async processRawThread(threadData: any): Promise<Claim | null> {
    // Normalize the thread
    const normalized = emailProcessor.normalizeThread(threadData);
    return await this.processEmailThread(normalized);
  }

  /**
   * Get claim statistics
   */
  async getStats() {
    const allClaims = await storage.getAllClaims();

    const stats = {
      total: allClaims.length,
      notified: allClaims.filter((c) => c.status === "NOTIFIED").length,
      surveyScheduled: allClaims.filter((c) => c.status === "SURVEY_SCHEDULED").length,
      plaSent: allClaims.filter((c) => c.status === "PLA_SENT").length,
      overdue: allClaims.filter((c) => {
        // Simple overdue logic: no survey date after 2 days from notification
        if (!c.surveyDate && c.notificationReceivedAt) {
          const notificationDate = new Date(c.notificationReceivedAt);
          const daysSinceNotification =
            (Date.now() - notificationDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceNotification > 2;
        }
        // Or no PLA after 2 days from survey
        if (!c.plaSentToRonnieAt && c.surveyDate) {
          const surveyDate = new Date(c.surveyDate);
          const daysSinceSurvey = (Date.now() - surveyDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceSurvey > 2;
        }
        return false;
      }).length,
    };

    return stats;
  }
}

export const claimProcessor = new ClaimProcessor();
