'use client'

import {
    RealtimeAgent,
    RealtimeSession,
    tool,
} from '@openai/agents/realtime';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { WavRecorder, WavStreamPlayer } from 'wavtools';
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react"
 


// UI components
import NewsFeed from "@/app/components/NewsFeed";
import { History } from "@/app/components/History";

import { getToken } from "@/app/server/token.action";
import { CombineInitPrompt } from '@/lib/utils';
import { useLanguage } from '@/app/contexts/LanguageContext';

// Tool: persist unfamiliar expressions for later review
const extractUnfamiliarEnglishTool = tool({
    name: 'extractUnfamiliarEnglish',
    description: 'Aggressive MODE: Call this tool AGGRESSIVELY whenever the above history contains ANY English (full sentence, a single word, code comments, or CN-EN mixed). Even if the user does NOT explicitly ask about a word, scan for potentially unfamiliar vocabulary, phrases, collocations, idioms, phrasal verbs, or grammar patterns ',
    parameters: {
        type: 'object',
        properties: {
            userMessage: {
                type: 'string',
                description: 'The user\'s original message that was analyzed',
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
});

function buildInstructions(lang, nativeLabel, targetLabel) {
    if (lang === 'en') {
        return `
You are ChatLearn, a friendly ${targetLabel} conversation tutor. Your goal is to help users practice ${targetLabel} through natural conversation while discovering learning opportunities.

Core Role:
- Lead immersive ${targetLabel} conversation and provide targeted learning support.

Key Behaviors:
- Mix the user's native language (${nativeLabel}) and ${targetLabel} in conversation at first; then adjust toward more ${targetLabel} or more ${nativeLabel} according to user preference.
- After each substantive user message, call the extractUnfamiliarEnglish tool.
- Frequently consider and remember to use extractUnfamiliarEnglish — use it aggressively.
- Prolong practice by asking follow-up questions.
- Offer gentle corrections; avoid information overload.
- Vary vocabulary and sentence patterns as learning examples.

Control & Topic Management:
- You control the flow and topics of the conversation.
- Keep discussion relevant to language-learning contexts.
- When the user goes off topic, gently redirect: "That's interesting! Let's practice by discussing [learning-related topic]."
- Steer toward vocabulary-rich, educational themes.
- Maintain learning focus throughout.

Learning Content Format:
1. Use a mix of ${nativeLabel} and ${targetLabel} in conversation.
2. Vocabulary format: target-language word (Chinese translation).
3. Keep explanations concise and contextual.
4. Identify and reinforce the user's language patterns.

Tool Usage:
- After any user message containing substantive English, call extractUnfamiliarEnglish to identify learning opportunities.

Be encouraging and patient, while maintaining clear conversational leadership for the best learning outcome.`;
    }
    if (lang === 'ja') {
        return `
あなたはChatLearn、フレンドリーな${targetLabel}会話チューターです。自然な対話を通して、ユーザーが${targetLabel}を練習できるよう支援します。

役割:
- 没入型の${targetLabel}会話を主導し、的確な学習サポートを提供する。

重要な行動:
- 会話の冒頭は母語（${nativeLabel}）と${targetLabel}を織り交ぜ、ユーザーの好みに応じてより${targetLabel}寄り／より${nativeLabel}寄りへ調整する。
- 各重要なユーザーメッセージの後に extractUnfamiliarEnglish ツールを呼び出す。
- このツールを頻繁に（積極的に）使うことを常に意識する。
- 追い質問で練習時間を伸ばす。
- 優しく訂正し、情報過多を避ける。
- 語彙・文型を変化させて学習例を示す。

コントロールと話題管理:
- 会話の流れとトピックはあなたが主導する。
- 言語学習の文脈に関連した話題を保つ。
- 脱線した場合はやさしく誘導：「面白いですね！[学習関連の話題]を使って練習しましょう」。
- 語彙が豊富で教育的なテーマへ導く。
- 常に学習へのフォーカスを維持する。

学習内容の形式:
1. 母語（${nativeLabel}）と${targetLabel}を織り交ぜた会話。
2. 語彙提示: 目標言語の単語（Chinese translation）。
3. 説明は簡潔に、状況に即して。
4. ユーザーの言語パターンを識別・強化する。

ツールの使用:
- 実質的な英語が含まれるユーザーメッセージの後は、extractUnfamiliarEnglish を呼び出し、学習機会を特定する。

励ましと忍耐を保ちつつ、最良の学習効果のために会話の主導権を明確に維持してください。`;
    }
    // default zh-CN
    return `
你是ChatLearn，一位友好的${targetLabel}对话导师，通过自然对话帮助用户练习${targetLabel}。

【核心角色】主导沉浸式${targetLabel}对话，提供针对性学习支持。

【关键行为】
- 用${nativeLabel}和${targetLabel}夹杂的方式进行交谈，然后根据用户偏好，采取更多${targetLabel}或者更多${nativeLabel}的表达方式；
- 在每个实质性用户消息后使用 extractUnfamiliarEnglish 工具；
- 经常思考并记得使用 extractUnfamiliarEnglish，这个工具要积极使用；
- 通过追问延长练习时间；
- 给予温和纠正，避免信息过载；
- 变化词汇/句式作为学习示例。

【控场与话题管理】
- 由你控制对话流程和话题；
- 保持讨论与语言学习情境相关；
- 当用户偏题时重新引导：“很有趣！让我们通过讨论[学习相关话题]来练习${targetLabel}”；
- 引导对话向词汇丰富、教育性的主题发展；
- 全程保持学习焦点。

【学习内容格式】
1. 使用${nativeLabel}与${targetLabel}混合的方式进行交谈；
2. 词汇呈现格式：目标语言词汇（中文翻译）；
3. 保持解释简洁且贴合语境；
4. 识别并强化用户的语言模式。

【工具使用】
- 在每个包含实质英语内容的用户消息后调用 extractUnfamiliarEnglish，识别学习机会。

保持鼓励和耐心，同时维持清晰的对话主导权以获得最佳学习效果。`;
}

function createLanguageAgent(nativeLabel, targetLabel, uiLangCode) {
    const instructions = buildInstructions(uiLangCode, nativeLabel, targetLabel);
    return new RealtimeAgent({
        name: 'LanguageLearnTeacher',
        instructions,
        tools: [extractUnfamiliarEnglishTool],
    });
}

// 生成 chat_history 中使用的 news_key：优先使用 RSS 原始链接保证唯一性，其次才是标题/临时 ID
// --- Conversation helpers ---------------------------------------------------

const sanitizeKeyString = (value) => String(value || 'default').replace(/\s+/g, '');

const getNewsKey = (news) => {
    if (!news) return 'default';
    const base = news.originalTitle || news.title || news.link || news.id || 'default';
    return sanitizeKeyString(base);
};

const createNewsContextMessage = (news) => {
    if (!news) return null;
    const contextText = CombineInitPrompt(news);
    if (!contextText) return null;
    const newsKey = getNewsKey(news);
    return {
        type: 'message',
        role: 'system',
        itemId: `news-context-${newsKey}`,
        content: [{
            type: 'output_text',
            text: contextText,
        }],
        metadata: {
            kind: 'news_context',
            newsKey,
            title: news.title || news.originalTitle || null,
        },
        createdAt: new Date().toISOString(),
    };
};

const ensureContextMessage = (historyItems, contextMessage) => {
    const list = Array.isArray(historyItems) ? historyItems : [];
    if (!contextMessage) return list;
    const hasContext = list.some((item) => item?.itemId === contextMessage.itemId);
    if (hasContext) {
        return list.map((item) => item?.itemId === contextMessage.itemId ? contextMessage : item);
    }
    return [contextMessage, ...list];
};

const extractMessageText = (message) => {
    if (!message?.content) return '';
    for (const content of message.content) {
        if (
            content.type === 'input_text' ||
            content.type === 'output_text' ||
            content.type === 'text'
        ) {
            if (typeof content.text === 'string' && content.text.trim()) {
                return content.text.trim();
            }
        }
        if (
            (content.type === 'input_audio' || content.type === 'output_audio') &&
            typeof content.transcript === 'string' &&
            content.transcript.trim()
        ) {
            return content.transcript.trim();
        }
    }
    return '';
};

// Remove manual placeholders when model returns the same text later
const dedupeManualMessages = (historyItems) => {
    const list = Array.isArray(historyItems) ? historyItems : [];
    const nonManualTexts = new Set();

    list.forEach((item) => {
        if (item?.role === 'user' && !item?.metadata?.manualInput) {
            const text = extractMessageText(item);
            if (text) nonManualTexts.add(text);
        }
    });

    return list.filter((item) => {
        if (item?.role === 'user' && item?.metadata?.manualInput) {
            const text = extractMessageText(item);
            if (text && nonManualTexts.has(text)) {
                return false;
            }
        }
        return true;
    });
};

export default function Home() {
    const { data: userSession } = useSession()
    const { learningLanguage, nativeLanguage } = useLanguage()
    const uiLangCode = useMemo(() => {
        const code = (nativeLanguage?.code || 'en').toLowerCase();
        if (code.startsWith('zh')) return 'zh';
        if (code.startsWith('ja')) return 'ja';
        return 'en';
    }, [nativeLanguage?.code]);
    const uiText = useMemo(() => ({
        en: { history: 'History', historyShort: 'History' },
        zh: { history: '对话历史', historyShort: '历史' },
        ja: { history: '履歴', historyShort: '履歴' },
    }[uiLangCode]), [uiLangCode]);
    
    const session = useRef(null);
    const player = useRef(null);
    const recorder = useRef(null);
    
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [history, setHistory] = useState([]);
    // Image capture handled by CameraCapture component.

    const [selectedNews, setSelectedNews] = useState(null)
    const selectedNewsRef = useRef(null)
    const newsContextMessageRef = useRef(null)
    const persistTimeoutRef = useRef(null)

    // 将某条新闻下的完整对话历史节流保存到后端
    const persistConversation = useCallback(async (news, conversationHistory) => {
        if (!news || !Array.isArray(conversationHistory) || conversationHistory.length === 0) return;
        if (!userSession?.user?.id) return;
        const payload = {
            newsKey: getNewsKey(news),
            newsTitle: news.originalTitle || news.title || news.id || 'Untitled',
            newsContent: news,
            history: conversationHistory,
            summary: null,
        };

        try {
            const res = await fetch('/api/chat-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Failed to persist chat history:', err);
            }
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }, [userSession?.user?.id]);

    // 在对话频繁更新时延迟触发保存，避免每条消息都打接口
    const scheduleConversationPersist = useCallback((news, conversationHistory) => {
        if (!news || !Array.isArray(conversationHistory) || conversationHistory.length === 0) return;
        if (!userSession?.user?.id) return;
        if (persistTimeoutRef.current) {
            clearTimeout(persistTimeoutRef.current);
        }
        persistTimeoutRef.current = setTimeout(() => {
            persistConversation(news, conversationHistory);
        }, 800);
    }, [persistConversation, userSession?.user?.id]);

    useEffect(() => {
        return () => {
            if (persistTimeoutRef.current) {
                clearTimeout(persistTimeoutRef.current);
            }
        };
    }, []);

    // localStorage helpers for selected news

    // 仅把当前选中的新闻存到 localStorage，刷新后还能定位
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

    // 当选择新闻时保存引用，并尝试从服务端读取对应的历史记录
    useEffect(() => {
        if (!selectedNews) {
            selectedNewsRef.current = null;
            newsContextMessageRef.current = null;
            setHistory([]);
            return;
        }

        selectedNewsRef.current = selectedNews;
        saveSelectedNewsToStorage(selectedNews);
        const contextMessage = createNewsContextMessage(selectedNews);
        newsContextMessageRef.current = contextMessage;

        if (!userSession?.user?.id) {
            setHistory(ensureContextMessage([], contextMessage));
            return;
        }

        const controller = new AbortController();
        const loadConversation = async () => {
            try {
                const newsKey = getNewsKey(selectedNews);
                const res = await fetch(`/api/chat-history?newsKey=${encodeURIComponent(newsKey)}`, {
                    cache: 'no-store',
                    signal: controller.signal,
                });
                if (!res.ok) {
                    throw new Error(`Failed to load conversation: ${res.status}`);
                }
                const json = await res.json().catch(() => ({}));
                const rows = Array.isArray(json?.data) ? json.data : [];
                if (rows.length > 0 && Array.isArray(rows[0]?.history)) {
                    const nextHistory = ensureContextMessage(rows[0].history, contextMessage);
                    setHistory(nextHistory);
                    if (!rows[0].history.some((item) => item?.itemId === contextMessage?.itemId) && contextMessage) {
                        scheduleConversationPersist(selectedNews, nextHistory);
                    }
                } else {
                    const seededHistory = ensureContextMessage([], contextMessage);
                    setHistory(seededHistory);
                    if (seededHistory.length > 0) {
                        scheduleConversationPersist(selectedNews, seededHistory);
                    }
                }
            } catch (error) {
                if (error.name === 'AbortError') return;
                console.error('Failed to load conversation from server:', error);
                const fallbackHistory = ensureContextMessage([], contextMessage);
                setHistory(fallbackHistory);
            }
        };

        loadConversation();
        return () => controller.abort();
    }, [selectedNews, userSession?.user?.id, scheduleConversationPersist]);

    // 每次成功连接并选择新闻后，向 Agent 注入当前新闻的初始提示
    useEffect(() => {
        if (!session.current) return
        if (!selectedNews) return
        if (!isConnected) return
        session.current.sendMessage(CombineInitPrompt(selectedNews))
    }, [selectedNews, isConnected])

    // 初始化 Realtime Session，并注册所有事件监听
    useEffect(() => {
        // cleanup any existing session instance before creating a new one
        if (session.current) {
            try { session.current.close(); } catch {}
            session.current = null;
        }

        const agent = createLanguageAgent(
            nativeLanguage?.label || '中文',
            learningLanguage?.label || 'English',
            uiLangCode,
        );

        session.current = new RealtimeSession(agent, {
            transport: 'websocket',
            model: 'gpt-realtime-mini',
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

                const historyIndexMap = new Map();
                const mergedHistory = [...prevHistory];
                prevHistory.forEach((item, index) => {
                    historyIndexMap.set(item.itemId, { item, index });
                });

                const contextMessage = newsContextMessageRef.current;
                const contextText = extractMessageText(contextMessage);

                const mergedFromAgent = newHistory
                    .map(item => {
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
                })
                    .filter((item) => {
                        if (!contextText) return true;
                        if (item.type === 'message' && item.role === 'user') {
                            const text = extractMessageText(item);
                            if (text && text === contextText) {
                                return false;
                            }
                        }
                        return true;
                    });

                mergedFromAgent.forEach((item) => {
                    const existing = historyIndexMap.get(item.itemId);
                    if (existing) {
                        mergedHistory[existing.index] = item;
                    } else {
                        historyIndexMap.set(item.itemId, { item, index: mergedHistory.length });
                        mergedHistory.push(item);
                    }
                });

                const finalHistory = ensureContextMessage(mergedHistory, contextMessage);
                const dedupedHistory = dedupeManualMessages(finalHistory);

                const currentSelectedNews = selectedNewsRef.current;
                if (currentSelectedNews) {
                    scheduleConversationPersist(currentSelectedNews, dedupedHistory);
                }

                return dedupedHistory;
            });
        });

        session.current.on('error', (error) => {
            console.error('error', error);
        });

        return () => {
            try { session.current?.close(); } catch {}
        }
    }, [nativeLanguage?.code, nativeLanguage?.label, learningLanguage?.code, learningLanguage?.label, uiLangCode, scheduleConversationPersist]);

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
                url: "wss://talknews.yasobi.xyz/v1/realtime?model=gpt-realtime-mini"
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

    // 文本输入消息发送，并将本地 history 与后端同步
    const sendTextMessage = function (input) {
        if (!session.current) return

        session.current.sendMessage(input)
        const id = uuidv4().slice(0, 32);
        const createdAt = new Date().toISOString();
        const msgItem = {
            type: "message",
            role: "user",
            content: [{
                type: "input_text",
                text: input,
            }],
            itemId: id,
            metadata: {
                manualInput: true,
                createdAt,
            },
            created_at: createdAt,
        };

        // 追加到 history
        setHistory(prevHistory => {
            const newHistory = [...prevHistory, msgItem];

            const currentSelectedNews = selectedNewsRef.current;
            if (currentSelectedNews) {
                scheduleConversationPersist(currentSelectedNews, newHistory);
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
                            {uiText.history}
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-2 flex flex-col h-screen lg:h-auto lg:min-h-0">
                <div className="flex flex-col lg:flex-row lg:gap-6 flex-1 min-h-0 lg:h-[calc(100vh-140px)]">
                    {/* Mobile News Cards - 在中等屏幕以下显示 */}
                    <div className="lg:hidden flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-foreground">Latest News</h2>
                            <a href="/history" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm">
                                {uiText.historyShort}
                            </a>
                        </div>
                        <div className="overflow-x-auto custom-scroll pb-2 -mx-4 px-4">
                            <NewsFeed
                                onArticleSelect={setSelectedNews}
                                selectedNews={selectedNews}
                                targetLanguage={learningLanguage?.code || 'en'}
                                nativeLanguage={nativeLanguage?.code || 'zh-CN'}
                                isMobile={true}
                            />
                        </div>
                    </div>

                    {/* Desktop News Cards - 在大屏幕以上显示 */}
                    <div className="hidden lg:flex lg:w-[40%] flex-col min-h-0 h-[calc(100vh-140px)]">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Latest News</h2>
                        <div
                            className="min-h-0 h-full overflow-y-auto custom-scroll overscroll-contain"
                            style={{ overscrollBehaviorY: 'contain' }}
                        >
                            <NewsFeed
                                onArticleSelect={setSelectedNews}
                                selectedNews={selectedNews}
                                targetLanguage={learningLanguage?.code || 'en'}
                                nativeLanguage={nativeLanguage?.code || 'zh-CN'}
                            />
                        </div>
                    </div>

                    {/* Chat Interface - Full width on mobile, 70% on desktop */}
                    <div className="flex-1 lg:w-[70%] flex flex-col min-h-0 lg:h-[calc(100vh-140px)]">
                        <History
                            isConnected={isConnected}
                            isMuted={isMuted}
                            toggleMute={toggleMute}
                            connect={connect}
                            history={history}
                            sendTextMessage={sendTextMessage}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
