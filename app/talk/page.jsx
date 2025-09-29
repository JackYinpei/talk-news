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
import { useSession } from "next-auth/react"
 


// UI components
import NewsFeed from "@/app/components/NewsFeed";
import { History } from "@/app/components/History";

import { getToken } from "@/app/server/token.action";
import { CombineInitPrompt } from '@/lib/utils';

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

const agent = new RealtimeAgent({
    name: 'LanguageLearnTeacher',
    instructions:
    `
    你是ChatLearn，一位友好的英语对话导师，通过自然对话帮助用户练习英语。
    
    **核心角色**：主导沉浸式英语对话，提供针对性学习支持。
    
    **关键行为**：
    - 用中英文夹杂的方式进行交谈，然后根据用户偏好，采取更英文或者更中文的表达方式
    - 在每个实质性用户消息后使用extractUnfamiliarEnglish工具
    - 通过追问延长练习时间
    - 给予温和纠正，避免信息过载
    - 变化词汇/句式作为学习示例
    
    **控场与话题管理**：
    - 由你控制对话流程和话题
    - 保持讨论与语言学习情境相关
    - 当用户偏题时重新引导："很有趣！让我们通过讨论[学习相关话题]来练习英语"
    - 引导对话向词汇丰富、教育性的主题发展
    - 全程保持学习焦点
    
    **学习内容格式**：
    1. 用中英文夹杂的方式进行交谈
    2. 词汇呈现格式：English word (中文翻译)
    3. 保持解释简洁且贴合语境
    4. 识别并强化用户的语言模式
    
    **工具使用**：在每个包含实质英语内容的用户消息后调用extractUnfamiliarEnglish，识别学习机会。
    
    保持鼓励和耐心，同时维持清晰的对话主导权以获得最佳学习效果。`,
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

                const payload = {
                    items,
                    context,
                    timestamp: new Date().toISOString(),
                    userMessage: userMessage ?? null,
                };

                // Log for debugging as requested
                console.log('extractUnfamiliarEnglish tool called with parameters:', payload);

                try {
                    const res = await fetch('/api/learning/unfamiliar-english', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        console.error('Failed to save unfamiliar English data:', err);
                        return { resp: 'save_failed', error: err?.error || 'Unknown error' };
                    }
                    const data = await res.json().catch(() => ({}));
                    return { resp: 'saved_in_db', data };
                } catch (e) {
                    console.error('Error calling save API:', e);
                    return { resp: 'save_error', error: e?.message || String(e) };
                }
            },
        }),
    ],
    // handoffs: [weatherExpert],
});

export default function Home() {
    const { data: userSession } = useSession()
    useEffect(() => {
        console.log("user session info", userSession)
    }, [userSession])
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
    const selectedNewsRef = useRef(null)

    // localStorage helpers
    const saveConversationToStorage = (newsKey, conversation) => {
        try {
            const conversations = JSON.parse(localStorage.getItem('chatConversations') || '{}');
            conversations[newsKey] = {
                ...conversation,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('chatConversations', JSON.stringify(conversations));
        } catch (error) {
            console.error('Failed to save conversation to localStorage:', error);
        }
    };

    const loadConversationFromStorage = (newsKey) => {
        try {
            const conversations = JSON.parse(localStorage.getItem('chatConversations') || '{}');
            return conversations[newsKey] || null;
        } catch (error) {
            console.error('Failed to load conversation from localStorage:', error);
            return null;
        }
    };

    const saveSelectedNewsToStorage = (news) => {
        try {
            localStorage.setItem('selectedNews', JSON.stringify(news));
        } catch (error) {
            console.error('Failed to save selectedNews to localStorage:', error);
        }
    };

    const loadSelectedNewsFromStorage = () => {
        try {
            const saved = localStorage.getItem('selectedNews');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Failed to load selectedNews from localStorage:', error);
            return null;
        }
    };

    // 加载初始状态
    useEffect(() => {
        const savedNews = loadSelectedNewsFromStorage();
        if (savedNews) {
            setSelectedNews(savedNews);
        }
    }, []);

    // 当选择新闻时保存并加载对应的对话历史
    useEffect(() => {
        if (selectedNews) {
            selectedNewsRef.current = selectedNews; // 更新 ref
            saveSelectedNewsToStorage(selectedNews);
            const newsKey = selectedNews.title || selectedNews.id || 'default';
            const savedConversation = loadConversationFromStorage(newsKey);
            if (savedConversation && savedConversation.history) {
                setHistory(savedConversation.history);
            } else {
                setHistory([]);
            }
        }
    }, [selectedNews]);

    useEffect(() => {
        if (!session.current) return
        if (!selectedNews) return
        if (!isConnected) return
        session.current.sendMessage(CombineInitPrompt(selectedNews))
    }, [selectedNews, isConnected])

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
            console.log("history updated", newHistory);
            
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

                // 过滤掉满足条件的item
                const filteredHistory = updatedHistory.filter(item => {
                    return !(item.type === 'message' &&
                            item.role === 'user' &&
                            item.content[0]?.type === 'input_text');
                });

                // 保存到 localStorage
                const currentSelectedNews = selectedNewsRef.current;
                if (currentSelectedNews) {
                    const newsKey = currentSelectedNews.title || currentSelectedNews.id || 'default';
                    saveConversationToStorage(newsKey, {
                        history: filteredHistory,
                        selectedNews: currentSelectedNews
                    });
                }

                return filteredHistory;
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
                url: "wss://talknews.yasobi.xyz/v1/realtime?model=gpt-realtime"
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
        if (!session.current) return

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
        setHistory(prevHistory => {
            const newHistory = [...prevHistory, msgItem];

            // 保存到 localStorage
            const currentSelectedNews = selectedNewsRef.current;
            if (currentSelectedNews) {
                const newsKey = currentSelectedNews.title || currentSelectedNews.id || 'default';
                saveConversationToStorage(newsKey, {
                    history: newHistory,
                    selectedNews: currentSelectedNews
                });
            }

            return newHistory;
        });
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card hidden md:block">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-card-foreground">English Learning Hub</h1>
                            <p className="text-muted-foreground mt-1">Learn English through news and AI conversation</p>
                        </div>
                        <a href="/history" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            对话历史
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6 flex flex-col h-screen lg:h-auto lg:min-h-0">
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 lg:h-[calc(100vh-140px)]">
                    {/* Mobile News Cards - 在中等屏幕以下显示 */}
                    <div className="lg:hidden flex-shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-foreground">Latest News</h2>
                            <a href="/history" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm">
                                历史
                            </a>
                        </div>
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
                    <div className="hidden lg:flex lg:w-[30%] flex-col min-h-0 h-[calc(100vh-140px)]">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Latest News</h2>
                        <div
                            className="min-h-0 h-full overflow-y-auto overscroll-contain"
                            style={{ overscrollBehaviorY: 'contain' }}
                        >
                            <NewsFeed
                                onArticleSelect={setSelectedNews}
                                selectedNews={selectedNews}
                                targetLanguage="en"
                                nativeLanguage="zh-CN"
                            />
                        </div>
                    </div>

                    {/* Chat Interface - Full width on mobile, 70% on desktop */}
                    <div className="flex-1 lg:w-[70%] flex flex-col min-h-0 lg:h-[calc(100vh-140px)]">
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
