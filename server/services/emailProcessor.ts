export interface EmailMessage {
  from: string;
  to: string[];
  cc?: string[];
  date: Date;
  subject: string;
  bodyText: string;
  attachmentNames?: string[];
}

export interface NormalizedThread {
  threadId: string;
  messages: EmailMessage[];
}

type GmailMessageSummary = {
  threadId?: string;
  id?: string;
  [key: string]: unknown;
};

type GmailMessagesData = {
  messages?: GmailMessageSummary[];
};

export class EmailProcessor {
  /**
   * Fetch an email thread from Gmail using Composio actions
   */
  async fetchThread(threadId: string, userId: string = "replit"): Promise<NormalizedThread> {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    try {
      const { Composio } = await import("@composio/core");
      const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
      
      // Use Composio tools.execute (v3 SDK)
      const result = await composio.tools.execute("GMAIL_FETCH_MESSAGE_BY_THREAD_ID", {
        userId: userId,
        arguments: {
          thread_id: threadId,
          user_id: "me",
        },
        dangerouslySkipVersionCheck: true,
      });

      if (!result?.data) {
        throw new Error("No thread data received from Composio");
      }

      // The result contains the thread data from Gmail
      return this.normalizeThread(result.data, threadId);
    } catch (error) {
      console.error("Error fetching thread:", error);
      throw new Error(`Failed to fetch thread ${threadId}: ${error}`);
    }
  }

  /**
   * List recent messages from a mailbox using Composio
   */
  async listMessages(query?: string, maxResults: number = 10, userId: string = "replit"): Promise<any[]> {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    try {
      const { Composio } = await import("@composio/core");
      const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
      
      // Use Composio tools.execute (v3 SDK)
      const result = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
        userId: userId,
        arguments: {
          query: query || "",
          max_results: maxResults,
          user_id: "me",
        },
        dangerouslySkipVersionCheck: true,
      });

      console.log("Gmail fetch result:", JSON.stringify(result, null, 2));

      const data = (result?.data as GmailMessagesData) || {};
      const messages = Array.isArray(data.messages) ? data.messages : [];
      return messages;
    } catch (error) {
      console.error("Error listing messages:", error);
      throw new Error(`Failed to list messages: ${error}`);
    }
  }

  /**
   * Normalize raw Gmail thread data into our structured format
   * Also handles simplified test data format
   */
  normalizeThread(threadData: any, threadId?: string): NormalizedThread {
    const messages: EmailMessage[] = [];

    // Handle case where threadData doesn't have messages array
    if (!threadData || !threadData.messages) {
      console.warn("Thread data missing messages array:", JSON.stringify(threadData).substring(0, 200));
      throw new Error("Invalid thread data structure - no messages array");
    }
    
    if (!Array.isArray(threadData.messages)) {
      throw new Error("Invalid thread data structure - messages is not an array");
    }

    for (const msg of threadData.messages) {
      // Check if this is simplified test format (has direct properties)
      if (msg.from && msg.subject && msg.bodyText) {
        messages.push({
          from: msg.from,
          to: Array.isArray(msg.to) ? msg.to : [msg.to],
          cc: msg.cc ? (Array.isArray(msg.cc) ? msg.cc : msg.cc.split(",").map((e: string) => e.trim()).filter(Boolean)) : undefined,
          date: new Date(msg.date),
          subject: msg.subject,
          bodyText: msg.bodyText,
          attachmentNames: msg.attachmentNames,
        });
        continue;
      }

      // Otherwise, parse Gmail format
      const headers = msg.payload?.headers || [];
      
      const getHeader = (name: string) => {
        const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || "";
      };

      const from = getHeader("From");
      const to = getHeader("To").split(",").map((e: string) => e.trim()).filter(Boolean);
      const cc = getHeader("Cc").split(",").map((e: string) => e.trim()).filter(Boolean);
      const subject = getHeader("Subject");
      const dateStr = getHeader("Date");
      
      // Extract body text
      let bodyText = "";
      if (msg.payload?.body?.data) {
        bodyText = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
      } else if (msg.payload?.parts) {
        // Handle multipart messages
        for (const part of msg.payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            bodyText += Buffer.from(part.body.data, "base64").toString("utf-8");
          }
        }
      }

      // Extract attachment names
      const attachmentNames: string[] = [];
      if (msg.payload?.parts) {
        for (const part of msg.payload.parts) {
          if (part.filename) {
            attachmentNames.push(part.filename);
          }
        }
      }

      messages.push({
        from,
        to,
        cc: cc.length > 0 ? cc : undefined,
        date: new Date(dateStr || msg.internalDate),
        subject,
        bodyText: bodyText.trim(),
        attachmentNames: attachmentNames.length > 0 ? attachmentNames : undefined,
      });
    }

    return {
      threadId: threadId || threadData.id || threadData.threadId || "unknown",
      messages,
    };
  }

  /**
   * Create a compact JSON representation of a thread for LLM processing
   * Note: Subject lines are included as they often contain Gladstone references
   */
  compactThreadForLLM(thread: NormalizedThread): string {
    const compact = {
      threadId: thread.threadId,
      messages: thread.messages.map((msg) => ({
        from: msg.from,
        to: msg.to,
        cc: msg.cc,
        date: msg.date.toISOString(),
        subject: msg.subject, // Subject often contains Gladstone ref like "G/1457/25B"
        body: msg.bodyText.substring(0, 2000), // Limit body length
        attachments: msg.attachmentNames,
      })),
    };

    return JSON.stringify(compact, null, 2);
  }

  /**
   * Convert a single thread to JSON string for processing
   * Mimics gmailClient.threadToJson() for backward compatibility
   */
  threadToJson(thread: any): string {
    // Handle NormalizedThread format
    if (thread.messages && Array.isArray(thread.messages)) {
      const formatted = {
        threadId: thread.threadId,
        messages: thread.messages.map((msg: any) => ({
          from: msg.from,
          to: msg.to,
          cc: msg.cc,
          date: msg.date instanceof Date ? msg.date.toISOString() : msg.date,
          subject: msg.subject,
          body: msg.bodyText || msg.body || "",
        })),
      };
      return JSON.stringify(formatted, null, 2);
    }
    
    // Handle GmailThread format
    return JSON.stringify(thread, null, 2);
  }

  /**
   * Convert multiple threads to JSON string for aggregation
   * Mimics gmailClient.threadsToJson() for backward compatibility
   */
  threadsToJson(threads: any[]): string {
    const formatted = {
      threadCount: threads.length,
      threads: threads.map((thread: any) => {
        if (thread.messages && Array.isArray(thread.messages)) {
          return {
            threadId: thread.threadId,
            subject: thread.subject,
            messageCount: thread.messages.length,
            messages: thread.messages.map((msg: any) => ({
              from: msg.from,
              to: msg.to,
              cc: msg.cc,
              date: msg.date instanceof Date ? msg.date.toISOString() : msg.date,
              subject: msg.subject,
              body: msg.bodyText || msg.body || "",
            })),
          };
        }
        return thread;
      }),
    };
    
    return JSON.stringify(formatted, null, 2);
  }

  /**
   * Search for Gmail threads by policy number
   * Uses GMAIL_FETCH_EMAILS to search and return multiple threads
   */
  async fetchThreadsByPolicy(
    policyNumber: string,
    userId: string = "replit"
  ): Promise<any[]> {
    if (!process.env.COMPOSIO_API_KEY) {
      throw new Error("COMPOSIO_API_KEY not configured");
    }

    try {
      const { Composio } = await import("@composio/core");
      const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

      // Search for emails containing the policy number
      const result = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
        userId: userId,
        arguments: {
          query: policyNumber,
          max_results: 50,
          user_id: "me",
        },
        dangerouslySkipVersionCheck: true,
      });

      const data = (result?.data as GmailMessagesData) || {};
      const messages = Array.isArray(data.messages) ? data.messages : [];
      const seenThreadIds: Record<string, true> = {};
      const threadIds: string[] = [];

      for (const msg of messages) {
        const threadId = (msg.threadId as string | undefined) || (msg.id as string | undefined);
        if (!threadId || seenThreadIds[threadId]) {
          continue;
        }
        seenThreadIds[threadId] = true;
        threadIds.push(threadId);
      }

      console.log(`Found ${threadIds.length} threads for policy ${policyNumber}`);

      // Fetch full details for each unique thread
      const threads: any[] = [];
      for (const threadId of threadIds) {
        try {
          const thread = await this.fetchThread(threadId, userId);
          // Convert NormalizedThread to GmailThread-like format for compatibility
          const gmailThreadFormat = {
            threadId: thread.threadId,
            subject: thread.messages[0]?.subject || "",
            messages: thread.messages.map((msg) => ({
              id: `${msg.from}-${msg.date.getTime()}`, // Synthetic ID
              threadId: thread.threadId,
              from: msg.from,
              to: msg.to[0] || "",
              subject: msg.subject,
              date: msg.date.toISOString(),
              body: msg.bodyText,
              snippet: msg.bodyText.substring(0, 100),
            })),
          };
          threads.push(gmailThreadFormat);
        } catch (error) {
          console.error(`Failed to fetch thread ${threadId}:`, error);
        }
      }

      return threads;
    } catch (error) {
      console.error("Error fetching threads by policy:", error);
      throw new Error(`Failed to fetch threads for policy ${policyNumber}: ${error}`);
    }
  }
}

// Export singleton instance (uses Composio for all Gmail operations)
export const emailProcessor = new EmailProcessor();
