"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";

/**
 * @typedef {Object} TranscriptProps
 * @property {string} userText - User input text
 * @property {function(string): void} setUserText - Set user input text
 * @property {function(): void} onSendMessage - Send message handler
 * @property {boolean} canSend - Whether messages can be sent
 * @property {function(): void} downloadRecording - Download recording handler
 */

/**
 * Transcript component for displaying conversation history
 * @param {TranscriptProps} props - Component props
 * @returns {JSX.Element} Transcript component
 */
function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
  sessionStatus,
  onToggleConnection,
}) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  /** @type {import('react').MutableRefObject<HTMLDivElement|null>} */
  const transcriptRef = useRef(null);
  /** @type {[Array, function(Array): void]} */
  const [prevLogs, setPrevLogs] = useState([]);
  const [justCopied, setJustCopied] = useState(false);
  /** @type {import('react').MutableRefObject<HTMLInputElement|null>} */
  const inputRef = useRef(null);

  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  /**
   * Scroll transcript to bottom
   */
  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  /**
   * Copy transcript to clipboard
   */
  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Transcript Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-sm font-medium text-slate-700">Conversation</span>
        <div className="flex gap-x-2">
          <button
            onClick={handleCopyTranscript}
            className="px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-x-1.5 text-slate-700 transition-colors duration-200"
          >
            <ClipboardCopyIcon className="w-3.5 h-3.5" />
            {justCopied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={downloadRecording}
            className="px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-x-1.5 text-slate-700 transition-colors duration-200"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Download Audio
          </button>
        </div>
      </div>

      {/* Transcript Content */}
      <div 
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4 min-h-0"
      >
        {transcriptItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">
                {canSend ? "Start a conversation..." : "Connecting to AI assistant..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {[...transcriptItems]
              .sort((a, b) => a.createdAtMs - b.createdAtMs)
              .map((item) => {
                const {
                  itemId,
                  type,
                  role,
                  data,
                  expanded,
                  timestamp,
                  title = "",
                  isHidden,
                  guardrailResult,
                } = item;

                if (isHidden) {
                  return null;
                }

                if (type === "MESSAGE") {
                  const isUser = role === "user";
                  const containerClasses = `flex ${isUser ? "justify-end" : "justify-start"}`;
                  const isBracketedMessage = title.startsWith("[") && title.endsWith("]");
                  const messageStyle = isBracketedMessage ? 'italic text-slate-400' : '';
                  const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;

                  return (
                    <div key={itemId} className={containerClasses}>
                      <div className={`max-w-[80%] ${isUser ? "" : "max-w-full"}`}>
                        <div className="flex items-start gap-3">
                          {!isUser && (
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`px-4 py-3 rounded-2xl ${
                                isUser 
                                  ? "bg-blue-500 text-white ml-auto" 
                                  : "bg-white border border-slate-200 shadow-sm"
                              } ${guardrailResult ? "" : ""}`}
                            >
                              <div className={`text-xs mb-1 ${isUser ? "text-blue-100" : "text-slate-400"} font-mono`}>
                                {timestamp}
                              </div>
                              <div className={`whitespace-pre-wrap leading-relaxed ${messageStyle} ${isUser ? "text-white" : "text-slate-800"}`}>
                                <ReactMarkdown>{displayTitle}</ReactMarkdown>
                              </div>
                            </div>
                            {guardrailResult && (
                              <div className="mt-2 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
                                <GuardrailChip guardrailResult={guardrailResult} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (type === "BREADCRUMB") {
                  return (
                    <div
                      key={itemId}
                      className="flex flex-col justify-start items-start"
                    >
                      <div className="text-center w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                          <span>{title}</span>
                          <span className="text-slate-400">{timestamp}</span>
                        </div>
                      </div>
                      {data && (
                        <div
                          className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 transition-colors duration-200 mt-1 w-full text-center"
                          onClick={() => toggleTranscriptItemExpand(itemId)}
                        >
                          <span className={`inline-block transform transition-transform duration-200 mr-1 ${expanded ? "rotate-90" : "rotate-0"}`}>
                            ▶
                          </span>
                          View details
                        </div>
                      )}
                      {expanded && data && (
                        <div className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-slate-700">
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={itemId}
                      className="flex justify-center text-slate-400 text-xs italic font-mono"
                    >
                      Unknown item type: {type}
                      <span className="ml-2">{timestamp}</span>
                    </div>
                  );
                }
              })}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <button
            onClick={onToggleConnection}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0 ${
              isConnected
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white disabled:bg-slate-300`}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isConnected ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 9v3m0 4h.01" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.552 15.552a6 6 0 10-8.104-8.104m8.104 8.104L12 12m3.552 3.552l-1.414-1.414" />
              </svg>
            )}
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSend && userText.trim()) {
                  onSendMessage();
                }
              }}
              className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm placeholder-slate-400"
              placeholder={canSend ? "Select an article first to start chatting..." : "Connecting..."}
              disabled={!canSend}
            />
          </div>
          <button
            onClick={onSendMessage}
            disabled={!canSend || !userText.trim()}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-full flex items-center justify-center transition-colors duration-200 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Transcript;