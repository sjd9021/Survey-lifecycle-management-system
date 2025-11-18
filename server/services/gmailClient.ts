import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  snippet: string;
}

export interface GmailThread {
  threadId: string;
  subject: string;
  messages: GmailMessage[];
}

export class GmailClient {
  /**
   * Fetch a single Gmail thread by threadId
   */
  async fetchThread(threadId: string): Promise<GmailThread | null> {
    try {
      const gmail = await getGmailClient();
      
      const threadData = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      });

      if (!threadData.data.messages || threadData.data.messages.length === 0) {
        console.warn(`Thread ${threadId} has no messages`);
        return null;
      }

      const messages: GmailMessage[] = [];
      let subject = '';

      for (const msg of threadData.data.messages) {
        const headers = msg.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const to = headers.find(h => h.name === 'To')?.value || 'Unknown';
        const msgSubject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown date';

        if (!subject) {
          subject = msgSubject;
        }

        // Extract body
        let body = msg.snippet || '';
        if (msg.payload?.parts) {
          const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (msg.payload?.body?.data) {
          body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
        }

        messages.push({
          id: msg.id!,
          threadId: msg.threadId!,
          from,
          to,
          subject: msgSubject,
          date,
          body,
          snippet: msg.snippet || '',
        });
      }

      return {
        threadId,
        subject,
        messages,
      };
    } catch (error: any) {
      console.error(`Error fetching thread ${threadId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch multiple threads by policy number
   * Searches Gmail for all threads containing the policy number
   */
  async fetchThreadsByPolicy(policyNumber: string): Promise<GmailThread[]> {
    try {
      const gmail = await getGmailClient();
      
      // Search for threads containing the policy number
      const searchResults = await gmail.users.threads.list({
        userId: 'me',
        q: policyNumber,
        maxResults: 50
      });

      if (!searchResults.data.threads || searchResults.data.threads.length === 0) {
        console.log(`No threads found for policy: ${policyNumber}`);
        return [];
      }

      console.log(`Found ${searchResults.data.threads.length} threads for policy: ${policyNumber}`);

      // Fetch full thread data for each result
      const threads: GmailThread[] = [];
      for (const threadInfo of searchResults.data.threads) {
        const thread = await this.fetchThread(threadInfo.id!);
        if (thread) {
          threads.push(thread);
        }
      }

      return threads;
    } catch (error: any) {
      console.error(`Error searching for policy ${policyNumber}:`, error.message);
      return [];
    }
  }

  /**
   * Convert GmailThread to JSON string for LLM processing
   */
  threadToJson(thread: GmailThread): string {
    return JSON.stringify({
      threadId: thread.threadId,
      subject: thread.subject,
      messageCount: thread.messages.length,
      messages: thread.messages.map(msg => ({
        from: msg.from,
        to: msg.to,
        date: msg.date,
        subject: msg.subject,
        body: msg.body,
      })),
    }, null, 2);
  }

  /**
   * Convert multiple threads to a single JSON string for LLM processing
   */
  threadsToJson(threads: GmailThread[]): string {
    return JSON.stringify({
      threadCount: threads.length,
      threads: threads.map(thread => ({
        threadId: thread.threadId,
        subject: thread.subject,
        messageCount: thread.messages.length,
        messages: thread.messages.map(msg => ({
          from: msg.from,
          to: msg.to,
          date: msg.date,
          subject: msg.subject,
          body: msg.body,
        })),
      })),
    }, null, 2);
  }
}

export const gmailClient = new GmailClient();
