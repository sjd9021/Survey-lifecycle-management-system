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

async function analyzeRecentEmails() {
  try {
    console.log("🔍 Fetching recent Gmail threads...\n");
    
    const gmail = await getGmailClient();
    
    // List recent threads
    const threads = await gmail.users.threads.list({
      userId: 'me',
      maxResults: 10,
      q: 'newer_than:14d'
    });

    console.log(`📧 Found ${threads.data.threads?.length || 0} recent threads\n`);

    // Analyze first 5 threads
    for (let i = 0; i < Math.min(5, threads.data.threads?.length || 0); i++) {
      const threadData = await gmail.users.threads.get({
        userId: 'me',
        id: threads.data.threads![i].id!,
        format: 'full'
      });

      console.log("=".repeat(80));
      console.log(`\n🧵 THREAD ${i + 1} - ID: ${threadData.data.id}`);
      console.log(`   Messages: ${threadData.data.messages?.length || 0}\n`);

      threadData.data.messages?.forEach((msg, idx) => {
        const headers = msg.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const to = headers.find(h => h.name === 'To')?.value || 'Unknown';
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown date';

        // Get body
        let body = msg.snippet || '';
        if (msg.payload?.parts) {
          const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        } else if (msg.payload?.body?.data) {
          body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
        }

        console.log(`   📨 Message ${idx + 1}:`);
        console.log(`      From: ${from}`);
        console.log(`      To: ${to}`);
        console.log(`      Date: ${date}`);
        console.log(`      Subject: ${subject}`);
        console.log(`      Body preview (first 500 chars):`);
        const preview = body.slice(0, 500).split('\n').map(line => `         ${line}`).join('\n');
        console.log(preview);
        console.log();
      });
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

analyzeRecentEmails();
