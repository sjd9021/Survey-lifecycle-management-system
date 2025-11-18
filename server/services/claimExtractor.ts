import OpenAI from "openai";
import type { InsertClaim } from "@shared/schema";

// Log warning at startup if API key is missing
if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "⚠️  OPENAI_API_KEY not set - email thread processing will be unavailable",
  );
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy" });

export interface ExtractedClaimData {
  gladstoneRef: string | null;
  policyNumber: string | null;
  clientRefs: string[];
  notificationReceivedAt: string | null;
  surveyDate: string | null;
  surveyDateFixedAt: string | null;
  plaForwardedInternallyAt: string | null;
  branch: string | null;
  insurer: string | null;
  consignee: string | null;
  commodity: string | null;
  summary: string | null;
  status: "NOTIFIED" | "WAITING_FOR_SURVEY_APPOINTMENT" | "SURVEY_SCHEDULED" | "SURVEY_OVERDUE" | "PLA_SENT" | "PLA_OVERDUE";
}

export class ClaimExtractor {
  /**
   * Extract claim data from an email thread using OpenAI
   */
  async extractClaimData(
    threadJson: string,
  ): Promise<ExtractedClaimData | null> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for claim extraction. " +
          "Please configure it to enable email thread processing.",
      );
    }

    const systemPrompt = `You are an expert at extracting structured claim information from marine/cargo insurance email threads.

Your task is to analyze email threads and extract key claim lifecycle data.

IMPORTANT CLAIM IDENTIFIERS:
- Gladstone Reference: Format like G/1829/25G, G/1457/25B
  - Often appears in email SUBJECT LINE (e.g., "RE: G/1457/25B - Survey Details")
  - May also appear in email body when replies reference the claim
  - May be null initially if claim just notified
- Policy Number: Insurance policy number (REQUIRED if no Gladstone ref)
  - Usually starts with numbers and hyphens (e.g., "21-H0963406")
  - Look for "Policy No:", "Policy Number:", "Cover Note No:"
  - This is the PRIMARY identifier when Gladstone ref is not yet assigned
- Client References: BL numbers, PI numbers, other reference numbers

KEY LIFECYCLE EVENTS TO DETECT:

1. NOTIFICATION RECEIVED (Event 1):
   - Look for emails where insurer/broker APPOINTS Gladstone as surveyor
   - Keywords: "appointment", "request your formal quotation", "conduct a survey", "new claim"
   - Extract the timestamp of the appointment email

2. SURVEY DATE DECIDED (Event 2):
   - Look for confirmation that a specific survey date is FIXED
   - Keywords: "survey is fixed for", "survey scheduled for", "will attend survey on"
   - Extract both the survey date AND when it was fixed (surveyDateFixedAt)

3. PLA FORWARDED INTERNALLY (Event 3):
   - Look for email FROM branch (mumbai@gladstone.co.in, bangalore@gladstone.co.in) TO internal staff like Ronnie, Pallavi
   - Subject usually contains "(PLA)" and Gladstone ref
   - Keywords: "PLA report", "preliminary loss advice", "attached soft copy of PLA"
   - Extract timestamp when PLA was sent internally

ADDITIONAL METADATA:
- Branch: Mumbai, Kolkata, Chennai, Delhi, Bangalore (infer from email addresses)
- Insurer: Company name like Marsh, TKY Japan, MSIG Singapore, CPIC, WK Webster, Chubb Korea
- Consignee: Customer company name
- Commodity: Type of cargo (glass, machinery, textiles, etc.)

STATUS CALCULATION RULES:
1. If notification received but NO survey date fixed for more than 2 calendar days → "WAITING_FOR_SURVEY_APPOINTMENT"
2. If survey date is fixed but hasn't happened yet → "SURVEY_SCHEDULED"
3. If survey date passed but no PLA sent for 12+ hours → "SURVEY_OVERDUE"
4. If PLA was sent internally → "PLA_SENT"
5. If PLA sent but no follow-up action for 12+ hours → "PLA_OVERDUE"
6. Otherwise (just notified) → "NOTIFIED"

SUMMARY GENERATION:
Generate a 3-4 line plain-English summary explaining:
- What happened in this claim (type of damage, commodity)
- Current status (where we are in the process)
- Next steps or what we're waiting for
Make it readable for non-technical staff to understand at a glance.

Return valid data if either policyNumber OR gladstoneRef exists (at least one is required).`;

    const userPrompt = `Analyze this email thread and extract claim data:\n\n${threadJson}`;

    try {
      console.log("🔍 Extracting claim data from thread...");
      console.log(
        "📧 Thread preview (first 500 chars):",
        threadJson.substring(0, 500),
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
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
                  type: ["string", "null"],
                  description:
                    "Gladstone reference like G/1829/25G (may be null if not assigned yet)",
                },
                policyNumber: {
                  type: ["string", "null"],
                  description:
                    "Insurance policy number (required if no Gladstone ref)",
                },
                clientRefs: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Array of client references (BL, PI numbers, etc - NOT including policy number)",
                },
                notificationReceivedAt: {
                  type: ["string", "null"],
                  description:
                    "ISO timestamp when notification/appointment was received",
                },
                surveyDate: {
                  type: ["string", "null"],
                  description: "ISO timestamp of the survey date",
                },
                surveyDateFixedAt: {
                  type: ["string", "null"],
                  description:
                    "ISO timestamp when survey date was confirmed/fixed",
                },
                plaForwardedInternallyAt: {
                  type: ["string", "null"],
                  description: "ISO timestamp when PLA was sent internally (to Ronnie, Pallavi, etc.)",
                },
                branch: {
                  type: ["string", "null"],
                  description:
                    "Branch name: Mumbai, Kolkata, Chennai, or Delhi",
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
                summary: {
                  type: ["string", "null"],
                  description: "3-4 line plain-English summary of claim status, events, and next steps",
                },
                status: {
                  type: "string",
                  enum: ["NOTIFIED", "WAITING_FOR_SURVEY_APPOINTMENT", "SURVEY_SCHEDULED", "SURVEY_OVERDUE", "PLA_SENT", "PLA_OVERDUE"],
                  description: "Current claim status based on lifecycle events and overdue rules",
                },
              },
              required: [
                "gladstoneRef",
                "policyNumber",
                "clientRefs",
                "notificationReceivedAt",
                "surveyDate",
                "surveyDateFixedAt",
                "plaForwardedInternallyAt",
                "branch",
                "insurer",
                "consignee",
                "commodity",
                "summary",
                "status",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        console.log("❌ No content returned from OpenAI");
        return null;
      }

      console.log("✅ OpenAI raw response:", content);
      const extracted = JSON.parse(content) as ExtractedClaimData;
      console.log("📊 Extracted data:", JSON.stringify(extracted, null, 2));

      // Validate we have at least one identifier: Gladstone ref OR policy number
      const gladstonePattern = /^G\/\d+\/\d{2}[A-Z]$/i;

      const hasValidGladstoneRef =
        extracted.gladstoneRef &&
        extracted.gladstoneRef !== "" &&
        extracted.gladstoneRef !== "null" &&
        extracted.gladstoneRef !== "/" &&
        gladstonePattern.test(extracted.gladstoneRef);

      const hasValidPolicyNumber =
        extracted.policyNumber &&
        extracted.policyNumber !== "" &&
        extracted.policyNumber !== "null";

      if (!hasValidGladstoneRef && !hasValidPolicyNumber) {
        console.log(
          `⏭️  Skipping email - no valid identifier (Gladstone: ${extracted.gladstoneRef}, Policy: ${extracted.policyNumber})`,
        );
        return null;
      }

      // Clean up invalid values
      if (!hasValidGladstoneRef) {
        extracted.gladstoneRef = null;
      }
      if (!hasValidPolicyNumber) {
        extracted.policyNumber = null;
      }

      console.log(
        `✓ Valid claim found - Gladstone: ${extracted.gladstoneRef || "N/A"}, Policy: ${extracted.policyNumber || "N/A"}`,
      );
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
      policyNumber: extracted.policyNumber,
      clientRefs: extracted.clientRefs,
      notificationReceivedAt: extracted.notificationReceivedAt
        ? new Date(extracted.notificationReceivedAt)
        : null,
      surveyDate: extracted.surveyDate ? new Date(extracted.surveyDate) : null,
      surveyDateFixedAt: extracted.surveyDateFixedAt
        ? new Date(extracted.surveyDateFixedAt)
        : null,
      plaForwardedInternallyAt: extracted.plaForwardedInternallyAt
        ? new Date(extracted.plaForwardedInternallyAt)
        : null,
      branch: extracted.branch,
      insurer: extracted.insurer,
      consignee: extracted.consignee,
      commodity: extracted.commodity,
      latestEmailDate: null,
      latestEmailSnippet: null,
      summary: extracted.summary,
      status: extracted.status,
    };
  }
}

export const claimExtractor = new ClaimExtractor();
