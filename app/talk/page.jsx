'use client'

import {
    RealtimeAgent,
    RealtimeSession,
    tool,
} from '@openai/agents/realtime';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { WavRecorder, WavStreamPlayer } from 'wavtools';
import { v4 as uuidv4 } from "uuid";


// UI components
import Transcript from "@/app/components/Transcript";
import NewsFeed from "@/app/components/NewsFeed";
import { History } from "@/app/components/History";

import { getToken } from "@/app/server/token.action";

const refundBackchannel = tool({
    name: 'refundBackchannel',
    description: 'Evaluate a refund',
    parameters: z.object({
        request: z.string(),
    }),
    execute: async ({ request }) => {
        console.log("request")
        // return handleRefundRequest(request);
    },
});

const guardrails = [
    {
        name: 'No mention of Dom',
        execute: async ({ agentOutput }) => {
            const domInOutput = agentOutput.includes('Dom');
            return {
                tripwireTriggered: domInOutput,
                outputInfo: {
                    domInOutput,
                },
            };
        },
    },
];

// const weatherTool = tool({
//     name: 'weather',
//     description: 'Get the weather in a given location',
//     parameters: z.object({
//         location: z.string(),
//     }),
//     execute: async ({ location }) => {
//         console.log("location", location);

//         // return backgroundResult(`The weather in ${location} is sunny.`);
//     },
// });

// const weatherExpert = new RealtimeAgent({
//     name: 'Weather Expert',
//     instructions:
//         'You are a weather expert. You are able to answer questions about the weather.',
//     tools: [weatherTool],
// });

// To invoke this tool, you can ask a question like "What is the special number?"
// const secretTool = tool({
//     name: 'secret',
//     description: 'A secret tool to tell the special number',
//     parameters: z.object({
//         question: z
//             .string()
//             .describe(
//                 'The question to ask the secret tool; mainly about the special number.',
//             ),
//     }),
//     execute: async ({ question }) => {
//         return `The answer to ${question} is 42.`;
//     },
//     // RealtimeAgent handles this approval process within tool_approval_requested events
//     needsApproval: true,
// });

const agent = new RealtimeAgent({
    name: 'LanguageLearnTeacher',
    instructions:
        `
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
                    items,
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
    // handoffs: [weatherExpert],
});

export default function Home() {
    const session = useRef(null);
    const player = useRef(null);
    const recorder = useRef(null);

    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [outputGuardrailResult, setOutputGuardrailResult] = useState(null);
    const [events, setEvents] = useState([]);
    const [history, setHistory] = useState([]);
    const [mcpTools, setMcpTools] = useState([]);
    // Image capture handled by CameraCapture component.

    const [selectedNews, setSelectedNews] = useState(null)

    useEffect(() => {
        session.current = new RealtimeSession(agent, {
            transport: 'websocket',
            model: 'gpt-realtime',
            config: {
                audio: {
                    output: {
                        voice: 'cedar',
                    },
                },
            },
        });
        recorder.current = new WavRecorder({ sampleRate: 24000 });
        player.current = new WavStreamPlayer({ sampleRate: 24000 });

        session.current.on('audio', (event) => {
            player.current?.add16BitPCM(event.data, event.responseId);
        });

        session.current.on('transport_event', (event) => {
            setEvents((events) => [...events, event]);
        });

        session.current.on('audio_interrupted', () => {
            // We only need to interrupt the player if we are already playing
            // everything else is handled by the session
            player.current?.interrupt();
        });

        session.current.on('history_updated', (newHistory) => {
            console.log("update history", newHistory);
            setHistory(prevHistory => {
                // 创建一个映射来保存已有的transcript内容
                const existingTranscripts = new Map();
                prevHistory.forEach(item => {
                    if (item.type === 'message' && item.role === 'assistant') {
                        item.content.forEach(content => {
                            if (content.type === 'output_audio' && content.transcript) {
                                existingTranscripts.set(item.itemId, content.transcript);
                            }
                        });
                    }
                });

                // 更新新历史，保留已有的transcript
                const updatedHistory = newHistory.map(item => {
                    if (item.type === 'message' && item.role === 'assistant' && existingTranscripts.has(item.itemId)) {
                        return {
                            ...item,
                            content: item.content.map(content => {
                                if (content.type === 'output_audio' && !content.transcript) {
                                    return {
                                        ...content,
                                        transcript: existingTranscripts.get(item.itemId)
                                    };
                                }
                                return content;
                            })
                        };
                    }
                    return item;
                });

                return updatedHistory;
            });
        });

        session.current.on('error', (error) => {
            console.error('error', error);
        });

        session.current.on(
            'guardrail_tripped',
            (_context, _agent, guardrailError) => {
                setOutputGuardrailResult(guardrailError);
            },
        );
        session.current.on('mcp_tools_changed', (tools) => {
            setMcpTools(tools.map((t) => t.name));
        });

        session.current.on(
            'tool_approval_requested',
            (_context, _agent, approvalRequest) => {
                // You'll be prompted when making the tool call that requires approval in web browser.
                const approved = confirm(
                    `Approve tool call to ${approvalRequest.approvalItem.rawItem.name} with parameters:\n ${JSON.stringify(approvalRequest.approvalItem.rawItem.arguments, null, 2)}?`,
                );
                if (approved) {
                    session.current?.approve(approvalRequest.approvalItem);
                } else {
                    session.current?.reject(approvalRequest.approvalItem);
                }
            },
        );

        session.current.on(
            'mcp_tool_call_completed',
            (_context, _agent, toolCall) => {
                session.current?.transport?.sendEvent({
                    type: 'response.create',
                });
            },
        );
    }, []);

    async function record() {
        await recorder.current?.record(async (data) => {
            await session.current?.sendAudio(data.mono);
        });
    }

    async function connect() {
        if (isConnected) {
            await session.current?.close();
            await player.current?.interrupt();
            await recorder.current?.end();
            setIsConnected(false);
        } else {
            await player.current?.connect();
            const token = await getToken();
            await session.current?.connect({
                apiKey: token,
            });
            await recorder.current?.begin();
            await record();
            setIsConnected(true);
        }
    }

    async function toggleMute() {
        if (isMuted) {
            await record();
            setIsMuted(false);
        } else {
            await recorder.current?.pause();
            setIsMuted(true);
        }
    }

    const sendTextMessage = function (input) {
        if (session.current) return

        session.current.sendMessage(input)
        const id = uuidv4().slice(0, 32);
        const msgItem = {
            type: "message",
            role: "user",
            content: [{
                type: "input_text",
                text: input,
            }],
            itemId: id,
        };

        // 追加到 history
        setHistory(prevHistory => [...prevHistory, msgItem]);
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card hidden md:block">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-card-foreground">English Learning Hub</h1>
                    <p className="text-muted-foreground mt-1">Learn English through news and AI conversation</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6 h-screen lg:h-[calc(100vh-140px)]">
                    {/* Mobile News Cards - 在中等屏幕以下显示 */}
                    <div className="lg:hidden">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Latest News</h2>
                        <div className="overflow-x-auto pb-4 -mx-4 px-4">
                            <NewsFeed
                                onArticleSelect={setSelectedNews}
                                selectedNews={selectedNews}
                                targetLanguage="en"
                                nativeLanguage="zh-CN"
                                isMobile={true}
                            />
                        </div>
                    </div>

                    {/* Desktop News Cards - 在大屏幕以上显示 */}
                    <div className="hidden lg:flex lg:w-[30%] flex-col">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Latest News</h2>
                        <div className="flex-1 overflow-y-auto">
                            <NewsFeed
                                onArticleSelect={setSelectedNews}
                                selectedNews={selectedNews}
                                targetLanguage="en"
                                nativeLanguage="zh-CN"
                            />
                        </div>
                    </div>

                    {/* Chat Interface - Full width on mobile, 70% on desktop */}
                    <div className="flex-1 lg:w-[70%] flex flex-col h-full">
                        <History
                            title="Realtime Demo via WebSocket"
                            isConnected={isConnected}
                            isMuted={isMuted}
                            toggleMute={toggleMute}
                            connect={connect}
                            history={history}
                            outputGuardrailResult={outputGuardrailResult}
                            events={events}
                            mcpTools={mcpTools}
                            sendTextMessage={sendTextMessage}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
