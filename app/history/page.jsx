'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, MessageCircle, Clock, ArrowLeft, User, Bot } from 'lucide-react';

export default function HistoryPage() {
    const [conversations, setConversations] = useState({});
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    const router = useRouter();

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = () => {
        try {
            const stored = localStorage.getItem('chatConversations');
            if (stored) {
                setConversations(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const deleteConversation = (newsKey) => {
        try {
            const updatedConversations = { ...conversations };
            delete updatedConversations[newsKey];
            localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
            setConversations(updatedConversations);
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const navigateToConversation = (newsKey, selectedNews) => {
        // 设置选中的新闻到 localStorage
        try {
            localStorage.setItem('selectedNews', JSON.stringify(selectedNews));
            router.push('/talk');
        } catch (error) {
            console.error('Failed to navigate to conversation:', error);
        }
    };

    const viewConversationDetail = (newsKey, conversation) => {
        setSelectedConversation({ newsKey, ...conversation });
        setViewMode('detail');
    };

    const backToList = () => {
        setSelectedConversation(null);
        setViewMode('list');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
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
        if (!selectedConversation || !selectedConversation.history) return null;

        const messages = selectedConversation.history.filter(item =>
            item.type === 'message' &&
            (item.role === 'user' || item.role === 'assistant')
        );

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
                            {selectedConversation.selectedNews?.title || selectedConversation.newsKey}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {formatDate(selectedConversation.lastUpdated)} • {messages.length} 条消息
                        </p>
                    </div>
                    <Button
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

    return (
        <div className="min-h-screen bg-background">
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
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                {viewMode === 'detail' ? (
                    renderConversationDetail()
                ) : Object.keys(conversations).length === 0 ? (
                    <div className="text-center py-12">
                        <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">还没有对话记录</h3>
                        <p className="text-muted-foreground mb-4">开始和 AI 对话来创建您的第一个对话记录</p>
                        <Button onClick={() => router.push('/talk')}>
                            开始对话
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(conversations)
                            .sort(([,a], [,b]) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
                            .map(([newsKey, conversation]) => (
                            <Card key={newsKey} className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg line-clamp-2 mb-2">
                                                {conversation.selectedNews?.title || newsKey}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 text-sm">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(conversation.lastUpdated)}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteConversation(newsKey);
                                            }}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        {conversation.selectedNews?.summary && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {conversation.selectedNews.summary}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="h-4 w-4" />
                                                {getMessageCount(conversation.history)} 条消息
                                            </span>
                                        </div>

                                        {getLastUserMessage(conversation.history) && (
                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <p className="text-sm font-medium text-foreground mb-1">最后消息:</p>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {getLastUserMessage(conversation.history)}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => viewConversationDetail(newsKey, conversation)}
                                                className="flex-1"
                                            >
                                                查看详情
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => navigateToConversation(newsKey, conversation.selectedNews)}
                                                className="flex-1"
                                            >
                                                继续对话
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}