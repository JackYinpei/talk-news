import { zodTextFormat } from 'openai/helpers/zod';
import { z } from "zod";

// Define the allowed moderation categories
const MODERATION_CATEGORIES = [
  "OFFENSIVE",
  "OFF_BRAND", 
  "VIOLENCE",
  "NONE",
];

// Create a Zod enum based on the same array
const ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);

// GuardrailOutput schema 
const GuardrailOutputZod = z.object({
  moderationRationale: z.string(),
  moderationCategory: ModerationCategoryZod,
  testText: z.string().optional(),
});

/**
 * Validator that calls the /api/responses endpoint to
 * validates the realtime output according to moderation policies. 
 * This will prevent the realtime model from responding in undesired ways
 * By sending it a corrective message and having it redirect the conversation.
 * @param {string} message
 * @param {string} companyName
 * @returns {Promise<GuardrailOutput>}
 */
export async function runGuardrailClassifier(
  message,
  companyName = 'newTelco',
) {
  const messages = [
    {
      role: 'user',
      content: `You are an expert at classifying text according to moderation policies. Consider the provided message, analyze potential classes from output_classes, and output the best classification. Output json, following the provided schema. Keep your analysis and reasoning short and to the point, maximum 2 sentences.

      <info>
      - Company name: ${companyName}
      </info>

      <message>
      ${message}
      </message>

      <output_classes>
      - OFFENSIVE: Content that includes hate speech, discriminatory language, insults, slurs, or harassment.
      - OFF_BRAND: Content that discusses competitors in a disparaging way.
      - VIOLENCE: Content that includes explicit threats, incitement of harm, or graphic descriptions of physical injury or violence.
      - NONE: If no other classes are appropriate and the message is fine.
      </output_classes>
      `,
    },
  ];

  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: messages,
      text: {
        format: zodTextFormat(GuardrailOutputZod, 'output_format'),
      },
    }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return Promise.reject('Error with runGuardrailClassifier.');
  }

  const data = await response.json();

  try {
    const output = GuardrailOutputZod.parse(data.output_parsed);
    return {
      ...output,
      testText: message,
    };
  } catch (error) {
    console.error('Error parsing the message content as GuardrailOutput:', error);
    return Promise.reject('Failed to parse guardrail output.');
  }
}

/**
 * @typedef {Object} RealtimeOutputGuardrailResult
 * @property {boolean} tripwireTriggered
 * @property {any} outputInfo
 */

/**
 * @typedef {Object} RealtimeOutputGuardrailArgs
 * @property {string} agentOutput
 * @property {any} [agent]
 * @property {any} [context]
 */

/**
 * Creates a guardrail bound to a specific company name for output moderation purposes.
 * @param {string} companyName
 * @returns {Object}
 */
export function createModerationGuardrail(companyName) {
  return {
    name: 'moderation_guardrail',

    /**
     * @param {RealtimeOutputGuardrailArgs} args
     * @returns {Promise<RealtimeOutputGuardrailResult>}
     */
    async execute({ agentOutput }) {
      try {
        const res = await runGuardrailClassifier(agentOutput, companyName);
        const triggered = res.moderationCategory !== 'NONE';
        return {
          tripwireTriggered: triggered,
          outputInfo: res,
        };
      } catch {
        return {
          tripwireTriggered: false,
          outputInfo: { error: 'guardrail_failed' },
        };
      }
    },
  };
}