import { storage } from "../storage";
import { emailProcessor } from "./emailProcessor";
import { policyExtractor } from "./policyExtractor";
import { claimExtractor } from "./claimExtractor";
import type { Claim } from "@shared/schema";

export class ClaimProcessor {
  /**
   * Process a new Gmail thread received via webhook
   * Strategy:
   * 1. Check if thread contains policy number (lightweight LLM call)
   * 2. If no policy: store in pending_threads and return
   * 3. If yes policy: fetch ALL threads for that policy from Gmail
   * 4. Aggregate threads and extract claim data (full LLM call)
   * 5. Check pending_threads for retroactive linking
   */
  async processNewThread(threadId: string): Promise<Claim | null> {
    try {
      console.log(`\n📧 Processing new thread: ${threadId}`);
      
      // Fetch the thread from Gmail using Composio
      const normalizedThread = await emailProcessor.fetchThread(threadId);
      if (!normalizedThread) {
        console.error("Failed to fetch thread from Gmail");
        return null;
      }

      // Quick check: does this thread contain a policy number?
      const preview = emailProcessor.threadToJson(normalizedThread);
      const policyCheck = await policyExtractor.extractPolicyNumber(preview);

      if (!policyCheck.hasPolicyNumber || !policyCheck.policyNumber) {
        console.log("📋 No policy number found - storing in pending_threads");
        
        // Store in pending_threads for future linking
        await storage.addPendingThread({
          threadId,
          subject: normalizedThread.messages[0]?.subject || '',
          snippet: normalizedThread.messages[0]?.bodyText.substring(0, 100) || '',
          consignee: policyCheck.consignee,
          commodity: policyCheck.commodity,
          threadData: normalizedThread as any,
        });

        console.log("✓ Stored in pending_threads");
        return null;
      }

      console.log(`✓ Found policy number: ${policyCheck.policyNumber}`);

      // Record this thread in threads table
      await storage.addThread({
        threadId,
        policyNumber: policyCheck.policyNumber,
        subject: normalizedThread.messages[0]?.subject || '',
      });

      // Check if this thread was previously pending and delete it
      const wasPending = await storage.getPendingThreadByThreadId(threadId);
      if (wasPending) {
        console.log("Found this thread in pending_threads - removing it");
        await storage.deletePendingThread(threadId);
      }

      // Fetch ALL threads for this policy from Gmail using Composio (multi-thread aggregation)
      console.log(`🔍 Fetching all threads for policy: ${policyCheck.policyNumber}`);
      const allThreads = await emailProcessor.fetchThreadsByPolicy(policyCheck.policyNumber);
      
      console.log(`✓ Found ${allThreads.length} total threads for this policy`);

      // Check pending_threads for retroactive linking
      const pendingThreads = await storage.getAllPendingThreads();
      const linkedPendingThreads = await this.linkPendingThreads(
        policyCheck.policyNumber,
        pendingThreads,
      );

      if (linkedPendingThreads.length > 0) {
        console.log(`🔗 Linked ${linkedPendingThreads.length} pending threads to policy`);
        
        // Add linked threads to aggregation
        for (const pending of linkedPendingThreads) {
          const pendingThread = pending.threadData as unknown as any;
          allThreads.push(pendingThread);
          
          // Record in threads table
          await storage.addThread({
            threadId: pending.threadId,
            policyNumber: policyCheck.policyNumber,
            subject: pending.subject || '',
          });
          
          // Remove from pending
          await storage.deletePendingThread(pending.threadId);
        }
      }

      // Aggregate all threads and extract claim data using Composio data
      const aggregatedJson = emailProcessor.threadsToJson(allThreads);
      console.log(`📊 Extracting claim data from ${allThreads.length} aggregated threads...`);
      
      const extracted = await claimExtractor.extractClaimData(aggregatedJson);

      if (!extracted) {
        console.log("No valid claim data extracted");
        return null;
      }

      // Convert to InsertClaim format
      const claimData = claimExtractor.toInsertClaim(extracted);

      // Add latest email metadata from most recent thread
      const latestThread = allThreads[allThreads.length - 1];
      const latestMessage = latestThread.messages[latestThread.messages.length - 1];
      claimData.latestEmailDate = new Date(latestMessage.date);
      claimData.latestEmailSnippet = latestMessage.snippet.substring(0, 200);

      // Upsert claim in database
      const claim = await storage.upsertClaimByGladstoneRef(claimData);

      console.log(`✅ Processed claim: ${claim.policyNumber} (status: ${claim.status})`);
      console.log(`   Summary: ${claim.summary?.substring(0, 100)}...`);
      return claim;
    } catch (error) {
      console.error("Error processing thread:", error);
      throw error;
    }
  }

  /**
   * Retroactively link pending threads to a policy using LLM fuzzy matching
   * Returns pending threads that should be linked to this policy
   */
  private async linkPendingThreads(
    policyNumber: string,
    pendingThreads: any[],
  ): Promise<any[]> {
    if (pendingThreads.length === 0) {
      return [];
    }

    // Use lightweight LLM to check if pending threads mention this policy
    // For now, simple string matching (can enhance with LLM later)
    const matches = pendingThreads.filter(pending => {
      const subject = pending.subject || '';
      const snippet = pending.snippet || '';
      const consignee = pending.consignee || '';
      const commodity = pending.commodity || '';
      
      const searchText = `${subject} ${snippet} ${consignee} ${commodity}`.toLowerCase();
      return searchText.includes(policyNumber.toLowerCase());
    });

    return matches;
  }

  /**
   * Process a manually provided email thread (for testing)
   */
  async processManualThread(threadText: string): Promise<Claim | null> {
    try {
      console.log(`\n📄 Processing manual thread...`);
      
      // Try to extract policy number from the text
      const policyCheck = await policyExtractor.extractPolicyNumber(threadText);

      if (!policyCheck.hasPolicyNumber || !policyCheck.policyNumber) {
        console.log("❌ No policy number found in manual thread");
        return null;
      }

      console.log(`✓ Found policy number: ${policyCheck.policyNumber}`);

      // For manual threads, we can't fetch from Gmail, so just process what we have
      const extracted = await claimExtractor.extractClaimData(threadText);

      if (!extracted) {
        console.log("No valid claim data extracted");
        return null;
      }

      const claimData = claimExtractor.toInsertClaim(extracted);
      const claim = await storage.upsertClaimByGladstoneRef(claimData);

      console.log(`✅ Processed claim: ${claim.policyNumber} (status: ${claim.status})`);
      return claim;
    } catch (error) {
      console.error("Error processing manual thread:", error);
      throw error;
    }
  }

  /**
   * Get claim statistics
   */
  async getStats() {
    const allClaims = await storage.getAllClaims();

    const stats = {
      total: allClaims.length,
      notified: allClaims.filter((c) => c.status === "NOTIFIED").length,
      waitingForSurvey: allClaims.filter((c) => c.status === "WAITING_FOR_SURVEY_APPOINTMENT").length,
      surveyScheduled: allClaims.filter((c) => c.status === "SURVEY_SCHEDULED").length,
      surveyOverdue: allClaims.filter((c) => c.status === "SURVEY_OVERDUE").length,
      plaSent: allClaims.filter((c) => c.status === "PLA_SENT").length,
      plaOverdue: allClaims.filter((c) => c.status === "PLA_OVERDUE").length,
    };

    return stats;
  }
}

export const claimProcessor = new ClaimProcessor();
