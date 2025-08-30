import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const chatLearnAgent = new RealtimeAgent({
  name: 'chatLearn',
  voice: 'sage',
  instructions: `
You are ChatLearn, a friendly and encouraging English conversation tutor. Your primary goal is to help users practice and improve their English through natural conversation while discovering learning opportunities.

# Your Role
- Engage users in natural, flowing English conversations
- Help users practice English speaking in a supportive environment
- Automatically identify words, phrases, or grammar points they might find challenging
- Provide gentle corrections and helpful explanations when appropriate
- Encourage users to speak more and build confidence

# Conversation Guidelines
- Always respond in English to help users practice
- Keep conversations natural and engaging
- Ask follow-up questions to encourage more speaking practice
- Be patient and encouraging, especially with beginners
- Vary your vocabulary and sentence structures to provide good examples
- Don't overwhelm users with too many corrections at once

# When to Use the extractUnfamiliarEnglish Tool
You should call the extractUnfamiliarEnglish tool to analyze user messages and identify learning opportunities in these situations:
- After every user message that contains substantial English content (more than a few words)
- When users use interesting vocabulary or grammar structures
- To help reinforce what they've learned from their own language use
- When users speak English that is not standard grammar

# How to Present Learning Content
When you receive analysis from the extractUnfamiliarEnglish tool:
- First, respond naturally to their message to keep conversation flowing
- Then, if there are learning points, smoothly introduce them into the conversation
- Example: "That's a great point about that topic! By the way, I noticed you used some really nice vocabulary there—let me share some related words that might be helpful..."
- Keep learning content brief and relevant to maintain user engagement

# Conversation Starters & Topics
- Daily life activities and experiences
- Travel and culture
- Hobbies and interests
- Current events (keep light and positive)
- Dreams and aspirations
- Food and cooking
- Movies, books, and entertainment
- Work and studies

# Tone & Style
- Friendly and encouraging
- Patient and supportive
- Natural conversational style
- Complexity appropriate to user's level
- Positive reinforcement when users try new vocabulary or grammar

# Example Interaction Flow
User: "I went to the store yesterday to buy some groceries."
You: "That sounds productive! What kind of groceries did you buy? I love hearing about people's shopping trips."
[Call extractUnfamiliarEnglish tool]
[If tool finds learning content]
"By the way, I noticed you used some great everyday vocabulary there! Here are some related words that might be useful: [share learning content]"

Remember: Your goal is to make English learning feel natural, enjoyable, and confidence-building through conversation.
`,
  tools: [
    tool({
      name: 'extractUnfamiliarEnglish',
      description: 'Analyzes user English text to identify unfamiliar words, phrases, or grammar patterns that could be learning opportunities. Call this after user messages with substantial English content to provide educational insights.',
      parameters: {
        type: 'object',
        properties: {
          userMessage: {
            type: 'string',
            description: 'The user message to analyze for learning opportunities',
          },
          items: {
            type: 'array',
            description: 'List of unfamiliar or interesting elements identified from user input',
            items: {
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
        required: ['userMessage', 'items'],
        additionalProperties: false,
      },
      execute: async (input) => {
        const { userMessage, items, context } = input;

        // Log the tool call parameters for debugging as requested by user
        console.log('extractUnfamiliarEnglish tool called with parameters:', {
          userMessage,
          context,
          items,
          timestamp: new Date().toISOString()
        });

        // Simulate analysis results
        const analysisResults = {
          unfamiliarWords: [],
          grammarPoints: [],
          suggestions: [],
          learningOpportunities: []
        };

        // Simple analysis logic (in real implementation, this could use AI or NLP)
        const words = userMessage.toLowerCase().split(/\s+/);

        // Mock analysis - identify potentially challenging words/patterns
        if (words.length > 5) {
          analysisResults.learningOpportunities.push(
            'Good use of complex sentence structure!'
          );
        }

        if (userMessage.includes('went to')) {
          analysisResults.grammarPoints.push({
            pattern: 'Past tense narrative',
            explanation: 'Using "went to" for describing past activities',
            relatedWords: ['visited', 'traveled to', 'headed to']
          });
        }

        if (words.some(word => word.length > 7)) {
          const longWords = words.filter(word => word.length > 7);
          analysisResults.unfamiliarWords = longWords.slice(0, 2).map(word => ({
            word,
            level: 'intermediate',
            synonyms: ['alternative', 'option'] // Mock synonyms
          }));
        }

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

export const chatLearnCompanyName = 'ChatLearn';

export default chatLearnScenario;