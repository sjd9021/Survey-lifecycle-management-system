import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  OPENAI_API_KEY not set - policy number extraction will be unavailable");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy" });

export interface PolicyExtractionResult {
  hasPolicyNumber: boolean;
  policyNumber: string | null;
  confidence: "high" | "medium" | "low";
  consignee: string | null;
  commodity: string | null;
}

export class PolicyExtractor {
  /**
   * Lightweight extraction to check if email thread contains a policy number
   * This is used to decide whether to store thread in pending_threads or process it
   */
  async extractPolicyNumber(threadPreview: string): Promise<PolicyExtractionResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required for policy extraction");
    }

    const systemPrompt = `You are a fast policy number detector for marine/cargo insurance emails.

Your ONLY job is to quickly check if an email thread contains an insurance policy number.

POLICY NUMBER PATTERNS:
- Often appears in subject line like "Policy No. ED1211743-KMC230035" or "Policy Number: 21-H0963406"
- May appear in body with prefixes: "Policy No:", "Policy Number:", "Cover Note No:", "Policy Ref:"
- Typical formats: 
  - Alphanumeric with hyphens: ED1211743-KMC230035, 21-H0963406
  - Sometimes just numbers: 1234567890
  - May have prefix codes: ED, H, KMC, etc.

WHAT TO IGNORE:
- Bill of Lading numbers (BL numbers)
- PI numbers
- Reference numbers
- Gladstone references (G/xxxx/xx format)
- Container numbers
- Invoice numbers

EXTRACTION STRATEGY:
1. Check email subject first (most reliable)
2. Then check email body for explicit "Policy" mentions
3. Extract consignee/customer name if mentioned
4. Extract commodity type if mentioned

CONFIDENCE LEVELS:
- high: Found in subject with "Policy No:" prefix
- medium: Found in body with "Policy" keyword nearby
- low: Looks like policy number but no explicit "Policy" label`;

    const userPrompt = `Check if this email thread preview contains a policy number:\n\n${threadPreview.substring(0, 2000)}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "policy_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hasPolicyNumber: {
                  type: "boolean",
                  description: "True if a policy number was found",
                },
                policyNumber: {
                  type: ["string", "null"],
                  description: "The extracted policy number (null if not found)",
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Confidence level of extraction",
                },
                consignee: {
                  type: ["string", "null"],
                  description: "Customer/consignee company name if mentioned",
                },
                commodity: {
                  type: ["string", "null"],
                  description: "Type of cargo/commodity if mentioned",
                },
              },
              required: ["hasPolicyNumber", "policyNumber", "confidence", "consignee", "commodity"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        return {
          hasPolicyNumber: false,
          policyNumber: null,
          confidence: "low",
          consignee: null,
          commodity: null,
        };
      }

      const result = JSON.parse(content) as PolicyExtractionResult;
      return result;
    } catch (error) {
      console.error("Error extracting policy number:", error);
      throw new Error(`Policy extraction failed: ${error}`);
    }
  }
}

export const policyExtractor = new PolicyExtractor();
