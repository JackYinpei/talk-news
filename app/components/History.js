'use client';
import { useEffect, useState } from 'react';

import { TextMessage } from './TextMessage';
import { FunctionCallMessage } from './FunctionCallMessage';

export function History({
    title = 'Realtime Agent Demo',
    isConnected,
    isMuted,
    toggleMute,
    connect,
    history,
    outputGuardrailResult,
    events,
    mcpTools = [],
    sendTextMessage,
}) {
    // Avoid hydration mismatches when layout changes between server and client
    const [mounted, setMounted] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    useEffect(() => setMounted(true), []);
    return (
        <div className="flex flex-col h-full min-h-0">
            <div
                className="overflow-y-auto pl-4 flex-1 rounded-lg bg-white space-y-4 min-h-0"
                id="chatHistory"
            >
                {history.map((item) => {

                    if (item.type === 'function_call') {
                        return <FunctionCallMessage message={item} key={item.itemId} />;
                    }

                    if (item.type === 'message') {
                        return (
                            <TextMessage
                                text={
                                    item.content.length > 0
                                        ? item.content
                                            .map((content) => {
                                                if (
                                                    content.type === 'output_text' ||
                                                    content.type === 'input_text'
                                                ) {
                                                    return content.text;
                                                }
                                                if (
                                                    content.type === 'input_audio' ||
                                                    content.type === 'output_audio'
                                                ) {
                                                    return content.transcript ?? '⚫︎⚫︎⚫︎';
                                                }
                                                return '';
                                            })
                                            .join('\n')
                                        : '⚫︎⚫︎⚫︎'
                                }
                                isUser={item.role === 'user'}
                                key={item.itemId}
                            />
                        );
                    }

                    return null;
                })}
            </div>
            <div className="flex gap-2 items-center">
                <button
                    onClick={() => connect()}
                    className={`w-10 lg:basis-1/10 h-10 rounded-full lg:rounded-lg font-medium transition-colors flex items-center justify-center text-lg ${isConnected
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    title={isConnected ? "Disconnect" : "Connect"}
                >
                    <span className="lg:hidden">{isConnected ? "🌐" : "📶"}</span>
                    <span className="hidden lg:inline">{isConnected ? "Disconnect" : "Connect"}</span>
                </button>
                
                <button
                    onClick={toggleMute}
                    className={`w-10 lg:basis-1/10 h-10 rounded-full lg:rounded-lg font-medium transition-colors flex items-center justify-center text-lg ${isMuted
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                        }`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    <span className="lg:hidden">{isMuted ? "🔇" : "🎤"}</span>
                    <span className="hidden lg:inline">{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && inputMessage.trim()) {
                            sendTextMessage(inputMessage.trim());
                            setInputMessage('');
                        }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />


                <button
                    onClick={() => {
                        if (inputMessage.trim()) {
                            sendTextMessage(inputMessage.trim());
                            setInputMessage('');
                        }
                    }}
                    disabled={!inputMessage.trim()}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
