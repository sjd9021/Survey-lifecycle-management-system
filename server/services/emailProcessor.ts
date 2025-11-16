import { google } from "googleapis";

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

export class EmailProcessor {
  /**
   * Fetch an email thread from Gmail using Composio actions
   */
  async fetchThread(threadId: string, userId: string = "replit"): Promise<NormalizedThread> {
    try {
      const { Composio } = await import("@composio/core");
      const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
      
      // Use Composio action to fetch thread
      const result = await composio.actions.execute(
        userId,
        "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
        {
          thread_id: threadId,
          user_id: "me",
        }
      );

      if (!result.data) {
        throw new Error("No thread data received from Composio");
      }

      // The result contains the thread data from Gmail
      return this.normalizeThread(result.data);
    } catch (error) {
      console.error("Error fetching thread:", error);
      throw new Error(`Failed to fetch thread ${threadId}: ${error}`);
    }
  }

  /**
   * List recent messages from a mailbox
   */
  async listMessages(query?: string, maxResults: number = 10): Promise<any[]> {
    try {
      const { getUncachableGmailClient } = await import("./gmailClient");
      const gmail = await getUncachableGmailClient();
      
      const response = await gmail.users.messages.list({
        userId: "me",
        q: query || "",
        maxResults: maxResults,
      });

      return response.data.messages || [];
    } catch (error) {
      console.error("Error listing messages:", error);
      throw new Error(`Failed to list messages: ${error}`);
    }
  }

  /**
   * Normalize raw Gmail thread data into our structured format
   */
  normalizeThread(threadData: any): NormalizedThread {
    const messages: EmailMessage[] = [];

    if (!threadData.messages || !Array.isArray(threadData.messages)) {
      throw new Error("Invalid thread data structure");
    }

    for (const msg of threadData.messages) {
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
      threadId: threadData.id,
      messages,
    };
  }

  /**
   * Create a compact JSON representation of a thread for LLM processing
   */
  compactThreadForLLM(thread: NormalizedThread): string {
    const compact = {
      threadId: thread.threadId,
      messages: thread.messages.map((msg) => ({
        from: msg.from,
        to: msg.to,
        cc: msg.cc,
        date: msg.date.toISOString(),
        subject: msg.subject,
        body: msg.bodyText.substring(0, 2000), // Limit body length
        attachments: msg.attachmentNames,
      })),
    };

    return JSON.stringify(compact, null, 2);
  }
}

// Export singleton instance (no need for access token with Replit integration)
export const emailProcessor = new EmailProcessor();
