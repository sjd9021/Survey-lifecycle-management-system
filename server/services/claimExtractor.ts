import OpenAI from "openai";
import type { InsertClaim } from "@shared/schema";

// Log warning at startup if API key is missing
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY not set - email thread processing will be unavailable");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy" });

export interface ExtractedClaimData {
  gladstoneRef: string;
  clientRefs: string[];
  notificationReceivedAt: string | null;
  surveyDate: string | null;
  surveyDateFixedAt: string | null;
  plaSentToRonnieAt: string | null;
  branch: string | null;
  insurer: string | null;
  consignee: string | null;
  commodity: string | null;
  status: "NOTIFIED" | "SURVEY_SCHEDULED" | "PLA_SENT";
}

export class ClaimExtractor {
  /**
   * Extract claim data from an email thread using OpenAI
   */
  async extractClaimData(threadJson: string): Promise<ExtractedClaimData | null> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for claim extraction. " +
        "Please configure it to enable email thread processing."
      );
    }
    
    const systemPrompt = `You are an expert at extracting structured claim information from marine/cargo insurance email threads.

Your task is to analyze email threads and extract key claim lifecycle data.

IMPORTANT CLAIM IDENTIFIERS:
- Gladstone Reference: Format like G/1829/25G, G/1457/25B (required)
- Client References: BL numbers, PI numbers, policy numbers, insurer refs

KEY LIFECYCLE EVENTS TO DETECT:

1. NOTIFICATION RECEIVED (Event 1):
   - Look for emails where insurer/broker APPOINTS Gladstone as surveyor
   - Keywords: "appointment", "request your formal quotation", "conduct a survey", "new claim"
   - Extract the timestamp of the appointment email

2. SURVEY DATE DECIDED (Event 2):
   - Look for confirmation that a specific survey date is FIXED
   - Keywords: "survey is fixed for", "survey scheduled for", "will attend survey on"
   - Extract both the survey date AND when it was fixed (surveyDateFixedAt)

3. PLA SENT TO RONNIE (Event 3):
   - Look for email FROM branch (mumbai@gladstone.co.in) TO Ronnie
   - Subject usually contains "(PLA)" and Gladstone ref
   - Keywords: "PLA report", "preliminary loss advice", "attached soft copy of PLA"
   - Extract timestamp when PLA was sent

ADDITIONAL METADATA:
- Branch: Mumbai, Kolkata, Chennai, Delhi (infer from email addresses)
- Insurer: Company name like Marsh, TKY Japan, MSIG Singapore, CPIC, WK Webster
- Consignee: Customer company name
- Commodity: Type of cargo (glass, machinery, textiles, etc.)

STATUS LOGIC:
- If PLA sent to Ronnie → status = "PLA_SENT"
- Else if survey date is set → status = "SURVEY_SCHEDULED"
- Else → status = "NOTIFIED"

Return null if no Gladstone reference is found (not a claim email).`;

    const userPrompt = `Analyze this email thread and extract claim data:\n\n${threadJson}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "claim_data",
            strict: true,
            schema: {
              type: "object",
              properties: {
                gladstoneRef: {
                  type: "string",
                  description: "Gladstone reference like G/1829/25G",
                },
                clientRefs: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of client references (BL, PI, policy numbers)",
                },
                notificationReceivedAt: {
                  type: ["string", "null"],
                  description: "ISO timestamp when notification/appointment was received",
                },
                surveyDate: {
                  type: ["string", "null"],
                  description: "ISO timestamp of the survey date",
                },
                surveyDateFixedAt: {
                  type: ["string", "null"],
                  description: "ISO timestamp when survey date was confirmed/fixed",
                },
                plaSentToRonnieAt: {
                  type: ["string", "null"],
                  description: "ISO timestamp when PLA was sent to Ronnie",
                },
                branch: {
                  type: ["string", "null"],
                  description: "Branch name: Mumbai, Kolkata, Chennai, or Delhi",
                },
                insurer: {
                  type: ["string", "null"],
                  description: "Insurer/broker company name",
                },
                consignee: {
                  type: ["string", "null"],
                  description: "Consignee/customer company name",
                },
                commodity: {
                  type: ["string", "null"],
                  description: "Type of cargo/commodity",
                },
                status: {
                  type: "string",
                  enum: ["NOTIFIED", "SURVEY_SCHEDULED", "PLA_SENT"],
                  description: "Current claim status based on events",
                },
              },
              required: [
                "gladstoneRef",
                "clientRefs",
                "notificationReceivedAt",
                "surveyDate",
                "surveyDateFixedAt",
                "plaSentToRonnieAt",
                "branch",
                "insurer",
                "consignee",
                "commodity",
                "status",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return null;
      }

      const extracted = JSON.parse(content) as ExtractedClaimData;

      // Validate Gladstone reference format (e.g., G/1829/25G)
      // Pattern: G/ followed by numbers, /, then 2 digits, then letter
      const gladstonePattern = /^G\/\d+\/\d{2}[A-Z]$/i;
      
      // If no valid Gladstone ref found, this isn't a claim email
      if (!extracted.gladstoneRef || 
          extracted.gladstoneRef === "" || 
          extracted.gladstoneRef === "null" || 
          extracted.gladstoneRef === "/" ||
          !gladstonePattern.test(extracted.gladstoneRef)) {
        console.log(`Skipping email - invalid or missing Gladstone ref: ${extracted.gladstoneRef}`);
        return null;
      }

      return extracted;
    } catch (error) {
      console.error("Error extracting claim data:", error);
      throw new Error(`OpenAI extraction failed: ${error}`);
    }
  }

  /**
   * Convert extracted data to InsertClaim format for database
   */
  toInsertClaim(extracted: ExtractedClaimData): InsertClaim {
    return {
      gladstoneRef: extracted.gladstoneRef,
      clientRefs: extracted.clientRefs,
      notificationReceivedAt: extracted.notificationReceivedAt
        ? new Date(extracted.notificationReceivedAt)
        : null,
      surveyDate: extracted.surveyDate ? new Date(extracted.surveyDate) : null,
      surveyDateFixedAt: extracted.surveyDateFixedAt
        ? new Date(extracted.surveyDateFixedAt)
        : null,
      plaSentToRonnieAt: extracted.plaSentToRonnieAt
        ? new Date(extracted.plaSentToRonnieAt)
        : null,
      branch: extracted.branch,
      insurer: extracted.insurer,
      consignee: extracted.consignee,
      commodity: extracted.commodity,
      latestEmailDate: null,
      latestEmailSnippet: null,
      status: extracted.status,
    };
  }
}

export const claimExtractor = new ClaimExtractor();
