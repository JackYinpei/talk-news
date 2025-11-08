'use client'

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MessageCircle, Clock, ArrowLeft, User, Bot } from 'lucide-react';
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'

export default function HistoryPage() {
    const [conversations, setConversations] = useState({});
    const [selectedConversationKey, setSelectedConversationKey] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingKey, setDeletingKey] = useState(null);
    const router = useRouter();
    const selectedConversation = selectedConversationKey ? conversations[selectedConversationKey] : null;

    const loadConversations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/chat-history?limit=100', { cache: 'no-store' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Failed to load conversations (${res.status})`);
            }
            const json = await res.json().catch(() => ({}));
            const rows = Array.isArray(json?.data) ? json.data : [];
            const mapped = rows.reduce((acc, row) => {
                const newsKey = row?.news_key || row?.newsKey;
                if (!newsKey) return acc;
                const selectedNews = row?.news || row?.newsContent || null;
                acc[newsKey] = {
                    id: row?.id,
                    newsKey,
                    selectedNews: selectedNews || (row?.news_title ? { title: row.news_title } : null),
                    newsTitle: row?.news_title || row?.newsTitle || null,
                    history: Array.isArray(row?.history) ? row.history : [],
                    lastUpdated: row?.updated_at || row?.created_at || new Date().toISOString(),
                    summary: row?.summary ?? null,
                };
                return acc;
            }, {});
            setConversations(mapped);
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
            setError(err?.message || '无法加载对话记录');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const deleteConversation = async (newsKey) => {
        if (!newsKey) return;
        setDeletingKey(newsKey);
        setError(null);
        try {
            const res = await fetch(`/api/chat-history?newsKey=${encodeURIComponent(newsKey)}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Failed to delete conversation (${res.status})`);
            }
            setConversations(prev => {
                const next = { ...prev };
                delete next[newsKey];
                return next;
            });
            if (selectedConversationKey === newsKey) {
                setSelectedConversationKey(null);
                setViewMode('list');
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            setError(error?.message || '删除对话失败');
        } finally {
            setDeletingKey(null);
        }
    };

    const navigateToConversation = (newsKey, selectedNews) => {
        if (!selectedNews) {
            console.error('Missing selected news payload, cannot resume conversation.');
            return;
        }
        // 设置选中的新闻到 localStorage
        try {
            localStorage.setItem('selectedNews', JSON.stringify(selectedNews));
            router.push('/talk');
        } catch (error) {
            console.error('Failed to navigate to conversation:', error);
        }
    };

    const viewConversationDetail = (newsKey) => {
        setSelectedConversationKey(newsKey);
        setViewMode('detail');
    };

    const backToList = () => {
        setSelectedConversationKey(null);
        setViewMode('list');
    };

    const formatDate = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getMessageCount = (history) => {
        if (!history || !Array.isArray(history)) return 0;
        return history.filter(item =>
            item.type === 'message' &&
            (item.role === 'user' || item.role === 'assistant')
        ).length;
    };

    const getLastUserMessage = (history) => {
        if (!history || !Array.isArray(history)) return '';

        const userMessages = history.filter(item =>
            item.type === 'message' &&
            item.role === 'user' &&
            item.content &&
            item.content[0] &&
            (item.content[0].text || item.content[0].transcript)
        );

        if (userMessages.length === 0) return '';

        const lastMessage = userMessages[userMessages.length - 1];
        const text = lastMessage.content[0].text || lastMessage.content[0].transcript;
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
    };

    const renderMessageContent = (message) => {
        if (message.role === 'user') {
            const audioContent = message.content?.find(c => c.type === 'input_audio');
            const textContent = message.content?.find(c => c.type === 'input_text');
            return audioContent?.transcript || textContent?.text || '';
        } else if (message.role === 'assistant') {
            const audioContent = message.content?.find(c => c.type === 'output_audio');
            const textContent = message.content?.find(c => c.type === 'text');
            return audioContent?.transcript || textContent?.text || '';
        }
        return '';
    };

    const renderConversationDetail = () => {
        if (!selectedConversation || !selectedConversation.history) {
            return (
                <div className="max-w-2xl mx-auto text-center py-12 text-muted-foreground">
                    未找到对话记录
                </div>
            );
        }

        const messages = selectedConversation.history.filter(item =>
            item.type === 'message' &&
            (item.role === 'user' || item.role === 'assistant')
        );
        const conversationTitle = selectedConversation.selectedNews?.title
            || selectedConversation.newsTitle
            || selectedConversation.newsKey;
        const summaryText = selectedConversation.selectedNews?.summary || selectedConversation.summary;

        return (
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={backToList}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        返回列表
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-foreground">
                            {conversationTitle}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {formatDate(selectedConversation.lastUpdated)} • {messages.length} 条消息
                        </p>
                        {summaryText && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {summaryText}
                            </p>
                        )}
                    </div>
                    <Button
                        disabled={!selectedConversation.selectedNews}
                        onClick={() => navigateToConversation(selectedConversation.newsKey, selectedConversation.selectedNews)}
                        className="flex items-center gap-2"
                    >
                        <MessageCircle className="h-4 w-4" />
                        继续对话
                    </Button>
                </div>

                <div className="space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={message.itemId || index}
                            className={`flex gap-3 ${message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                message.role === 'assistant'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground'
                            }`}>
                                {message.role === 'assistant' ? (
                                    <Bot className="h-4 w-4" />
                                ) : (
                                    <User className="h-4 w-4" />
                                )}
                            </div>
                            <div className={`flex-1 max-w-[80%] ${
                                message.role === 'assistant' ? 'text-left' : 'text-right'
                            }`}>
                                <div className={`inline-block px-4 py-2 rounded-lg ${
                                    message.role === 'assistant'
                                        ? 'bg-muted text-foreground'
                                        : 'bg-primary text-primary-foreground'
                                }`}>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {renderMessageContent(message)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderConversationList = () => {
        const entries = Object.entries(conversations);
        if (isLoading) {
            return (
                <div className="text-center py-12 text-muted-foreground">
                    正在加载对话记录...
                </div>
            );
        }

        if (entries.length === 0 && error) {
            return (
                <div className="text-center py-12 space-y-4">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button onClick={loadConversations} variant="outline">
                        重试
                    </Button>
                </div>
            );
        }

        if (entries.length === 0) {
            return (
                <div className="text-center py-12">
                    <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">还没有对话记录</h3>
                    <p className="text-muted-foreground mb-4">开始和 AI 对话来创建您的第一个对话记录</p>
                    <Button onClick={() => router.push('/talk')}>
                        开始对话
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {error && (
                    <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive md:flex-row md:items-center md:justify-between">
                        <span>{error}</span>
                        <Button size="sm" variant="outline" onClick={loadConversations}>
                            重试
                        </Button>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {entries
                    .sort(([, a], [, b]) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
                    .map(([newsKey, conversation]) => {
                        const summaryText = conversation.selectedNews?.summary || conversation.summary;
                        const messageCount = getMessageCount(conversation.history);
                        const lastMessage = getLastUserMessage(conversation.history);
                        const disableResume = !conversation.selectedNews;
                        const title = conversation.selectedNews?.title || conversation.newsTitle || newsKey;
                        const lastUpdatedLabel = formatDate(conversation.lastUpdated);

                        return (
                            <Card key={newsKey} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg line-clamp-2 mb-2">
                                                {title}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4" />
                                                {lastUpdatedLabel}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={deletingKey === newsKey}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteConversation(newsKey);
                                            }}
                                            className={`text-muted-foreground hover:text-destructive ${deletingKey === newsKey ? 'opacity-50' : ''}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        {summaryText && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {summaryText}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="h-4 w-4" />
                                                {messageCount} 条消息
                                            </span>
                                        </div>

                                        {lastMessage && (
                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <p className="text-sm font-medium text-foreground mb-1">最后消息:</p>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {lastMessage}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => viewConversationDetail(newsKey)}
                                                className="flex-1"
                                            >
                                                查看详情
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={disableResume}
                                                onClick={() => navigateToConversation(newsKey, conversation.selectedNews)}
                                                className="flex-1"
                                            >
                                                继续对话
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/talk')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            返回对话
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-card-foreground">对话历史</h1>
                            <p className="text-muted-foreground mt-1">
                                {viewMode === 'detail' ? '查看对话详情' : '查看和管理您的所有对话记录'}
                            </p>
                        </div>
                        <div className="flex-1" />
                        <Button asChild variant="outline" size="sm">
                            <Link href="/history/words">生词本</Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                {viewMode === 'detail' ? renderConversationDetail() : renderConversationList()}
            </div>
        </div>
    );
}
