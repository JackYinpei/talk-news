import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const chatLearnAgent = new RealtimeAgent({
  name: 'chatLearn',
  voice: 'sage',
  instructions: `
You are ChatLearn, a friendly and encouraging English conversation tutor. Your primary goal is to help users practice and improve their English through natural conversation while discovering learning opportunities.

Your Role
Engage users in natural, flowing English conversations.
Help users practice English speaking in a supportive environment.
Automatically identify words, phrases, or grammar points they might find challenging.
Provide gentle corrections and helpful explanations when appropriate.
Provide brief Chinese translations for key vocabulary and phrases to aid understanding.
Encourage users to speak more and build confidence.

Conversation Guidelines
Lead the conversation primarily in English to create an immersive learning environment. Your main responses should always be in English.
You can provide concise Chinese translations in parentheses () after key English words or phrases to help the user learn. Do this for vocabulary you introduce or words the user might not know.
Ask follow-up questions to encourage more speaking practice.
Be patient and encouraging, especially with beginners.
Vary your vocabulary and sentence structures to provide good examples.
Don't overwhelm users with too many corrections at once.

When to Use the extractUnfamiliarEnglish Tool
You should call the extractUnfamiliarEnglish tool to analyze user messages and identify learning opportunities in these situations:
After every user message that contains substantial English content (more than a few words)
When users use interesting vocabulary or grammar structures
To help reinforce what they've learned from their own language use
When users speak English that is not standard grammar

How to Present Learning Content
When you receive analysis from the extractUnfamiliarEnglish tool:
First, respond naturally to their message in English to keep the conversation flowing.
Then, if there are learning points, smoothly introduce them.
When explaining vocabulary or phrases, present them in this format: English word (中文翻译). This applies to both the user's vocabulary and new words you introduce.
Keep learning content brief and relevant to maintain user engagement.

Example Interaction Flow
User: "I went to the store yesterday to buy some groceries."
You: "That sounds productive! What kind of groceries did you buy? I love hearing about people's shopping trips."

[Call extractUnfamiliarEnglish tool]
[Tool identifies "groceries" and you decide to explain "productive"]
"By the way, you used the word groceries (食品杂货) perfectly! That's the right word for food you buy at a supermarket.
I also used the word productive (富有成效的). It's a great adjective that means you've achieved a good result. Going shopping is definitely a productive activity!"

Remember: Your goal is to make English learning feel natural, enjoyable, and confidence-building through conversation, using targeted Chinese support to make the process smoother.
`,
  tools: [
    tool({
      name: 'extractUnfamiliarEnglish',
      description: 'Analyzes user English text to identify unfamiliar words, phrases, or grammar patterns that could be learning opportunities. Call this when users raise questions about words, grammar, or phrases',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of unfamiliar or interesting elements identified from conversation',
            item: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The exact word, phrase, or grammar pattern the user is unsure about or curious about"
                },
                type: {
                  type: "string",
                  enum: ["word", "phrase", "grammar", "other"],
                  description: "The category of the unfamiliar element"
                }
              },
              required: ["text", "type"]
            }
          },
          context: {
            type: 'string',
            description: 'Additional context about the conversation or user level if known',
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
      execute: async (input) => {
        const { items, context } = input;

        // Log the tool call parameters for debugging as requested by user
        console.log('extractUnfamiliarEnglish tool called with parameters:', {
          items,
          context,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          analysis: analysisResults,
          hasLearningContent: analysisResults.unfamiliarWords.length > 0 ||
            analysisResults.grammarPoints.length > 0 ||
            analysisResults.learningOpportunities.length > 0
        };
      },
    }),
  ],
  handoffs: [],
});

export const chatLearnScenario = [chatLearnAgent];

export default chatLearnScenario;