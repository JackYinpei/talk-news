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
        <div className="flex flex-col h-full max-w-2xl">
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
            
            <div className="bg-white border-t p-4">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <button 
                        onClick={() => connect()} 
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isConnected 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        {isConnected ? "Disconnect" : "Connect"}
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
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}