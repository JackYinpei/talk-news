'use client';

import { useState, useEffect, useRef } from 'react';
import { getSystemInstruction } from '../lib/prompts';
import { useLanguage } from '../context/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';

// --- Audio Utils ---
const encode = (bytes) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const createBlob = (data) => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
};

const decode = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (data, ctx, sampleRate, numChannels) => {
  const buffer = ctx.createBuffer(numChannels, data.length / 2 / numChannels, sampleRate);
  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }
  if (numChannels === 1) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter((_, index) => index % numChannels === i);
      buffer.copyToChannel(channel, i);
    }
  }
  return buffer;
};
// --- End of Audio Utils ---

export default function ArticleChatView({ article, onClose }) {
  const { nativeLanguage, targetLanguage } = useLanguage();
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [processedDescription, setProcessedDescription] = useState('');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // --- Realtime Audio State ---
  const [isRealtimeRecording, setIsRealtimeRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [realtimeStatus, setRealtimeStatus] = useState('未初始化');
  const [realtimeError, setRealtimeError] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef(null);
  const clientRef = useRef(null);
  const sessionRef = useRef(null);
  const inputAudioContextRef = useRef(null);
  const outputAudioContextRef = useRef(null);
  const inputNodeRef = useRef(null);
  const outputNodeRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const scriptProcessorNodeRef = useRef(null);
  const sourcesRef = useRef(new Set());

  useEffect(() => {
    if (article) {
      // Reset states for the new article
      setMessages([]);
      setUserInput('');
      setTranslatedTitle('');
      
      // Process description to remove citation markers and add image styling
      const processDescription = (description) => {
        if (!description) return '';
        
        // Remove citation markers like [firstpost#1], [thehindu#1], etc.
        let processed = description.replace(/\[[\w#]+\]/g, '');
        
        // Add CSS styling to images to make them smaller
        processed = processed.replace(
          /<img([^>]*?)>/gi, 
          '<img$1 style="max-width: 300px; height: auto; display: block; margin: 10px 0;">'
        );
        
        return processed;
      };
      
      setProcessedDescription(processDescription(article.description));
      
      stopRealtimeRecording();
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }

      const translateTitle = async () => {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: article.title, targetLang: nativeLanguage }),
          });
          if (!response.ok) throw new Error('Translation failed');
          const data = await response.json();
          setTranslatedTitle(data.translation);
        } catch (error) {
          console.error('Title translation error:', error);
          setTranslatedTitle(article.title);
        }
      };

      const startChat = async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article, targetLang: targetLanguage }),
          });
          const data = await response.json();
          const aiMessage = `${data.summary}\n\nHere are some questions for you:\n1. ${data.questions[0]}\n2. ${data.questions[1]}\n3. ${data.questions[2]}`;
          setMessages([{ sender: 'ai', text: aiMessage }]);
        } catch (error) {
          setMessages([{ sender: 'ai', text: 'Sorry, I had trouble starting the conversation.' }]);
        } finally {
          setLoading(false);
        }
      };
      
      initRealtimeSession();
      translateTitle();
      startChat();
    }
  }, [article, nativeLanguage, targetLanguage]);

  useEffect(() => {
    if (outputNodeRef.current) {
      outputNodeRef.current.gain.value = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  const initAudioContexts = () => {
    try {
      if (!inputAudioContextRef.current) {
        inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      
      if (!inputNodeRef.current) {
        inputNodeRef.current = inputAudioContextRef.current.createGain();
      }
      if (!outputNodeRef.current) {
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      }
      
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
      return true;
    } catch (error) {
      console.error('Error initializing audio contexts:', error);
      setRealtimeError('Failed to set up audio hardware: ' + error.message);
      return false;
    }
  };

  const initRealtimeSession = async () => {
    if (!initAudioContexts()) return;

    const model = 'gemini-2.5-flash-preview-native-audio-dialog';

    try {
      setRealtimeStatus('获取安全令牌...');
      const response = await fetch('/api/tmptoken');
      const tokenData = await response.json();
      if (!response.ok) {
        throw new Error(tokenData.error || 'Failed to fetch token');
      }
      
      const client = new GoogleGenAI({
        apiKey: tokenData,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      clientRef.current = client;

      setRealtimeStatus('正在连接到 AI...');
      sessionRef.current = await client.live.connect({
        model: model,
        callbacks: {
          onopen: () => setRealtimeStatus('连接已建立，请按开始会话'),
          onmessage: async (message) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
            if (audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(audio.data), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error('Connection error', e); setRealtimeError(e.message); },
          onclose: (e) => setRealtimeStatus('连接关闭: ' + e.reason),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } } },
          systemInstruction: getSystemInstruction(targetLanguage, nativeLanguage, article.description),
        },
      });
    } catch (e) {
      console.error('创建会话失败:', e);
      setRealtimeError('创建会话失败: ' + e.message);
    }
  };

  const startRealtimeRecording = async () => {
    if (isRealtimeRecording) return;
    if (!sessionRef.current || sessionRef.current.state === 'closed') {
      await initRealtimeSession();
    }

    inputAudioContextRef.current.resume();
    outputAudioContextRef.current.resume();
    setRealtimeStatus('请求麦克风权限...');

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setRealtimeStatus('麦克风权限已授予，开始捕获...');
      sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      sourceNodeRef.current.connect(inputNodeRef.current);
      const bufferSize = 256;
      scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorNodeRef.current.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const pcmData = e.inputBuffer.getChannelData(0);
        if (sessionRef.current) sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
      };
      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);
      isRecordingRef.current = true;
      setIsRealtimeRecording(true);
      setRealtimeStatus('🔴 实时对话中...');
    } catch (err) {
      console.error('开始录音时出错:', err);
      setRealtimeStatus(`错误: ${err.message}`);
      stopRealtimeRecording();
    }
  };

  const stopRealtimeRecording = () => {
    if (!isRecordingRef.current && !mediaStreamRef.current) return;
    setRealtimeStatus('停止录音...');
    isRecordingRef.current = false;
    setIsRealtimeRecording(false);
    if (scriptProcessorNodeRef.current && sourceNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }
    scriptProcessorNodeRef.current = null;
    sourceNodeRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setRealtimeStatus('会话已停止');
  };

  const handleToggleConversation = () => {
    if (isRealtimeRecording) {
      stopRealtimeRecording();
    } else {
      startRealtimeRecording();
    }
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const handlePlayAudio = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Sorry, your browser does not support text-to-speech.");
    }
  };

  const handleListen = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Sorry, your browser does not support speech recognition.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => setUserInput(event.results[0][0].transcript);
    recognition.start();
    recognitionRef.current = recognition;
  };

  if (!article) {
    return (
      <div className="h-full bg-gray-100 p-4 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Select an article to read its details.</p>
      </div>
    );
  }

  return (
    <div className="md:h-full bg-white p-6 rounded-lg shadow flex flex-col">
      {/* Article Details Section */}
      <div className="flex-shrink-0 md:max-h-80 md:overflow-y-auto">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl font-bold mb-3">{translatedTitle || article.title}</h2>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-800" aria-label="Close article">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {article.author && <p className="text-sm text-gray-500 mb-1">By {article.author}</p>}
        {article.publishedAt && <p className="text-sm text-gray-500 mb-4">Published: {new Date(article.publishedAt).toLocaleDateString()}</p>}
        <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: processedDescription }}></div>
      </div>

      {/* Divider */}
      <div className="mt-6 mb-4 border-t border-gray-200"></div>

      {/* Chat Window Section */}
      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">AI 聊天</h2>
        
        {/* Realtime Controls */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg flex-shrink-0">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">实时语音对话</h3>
          <div className="flex gap-2 mb-2 flex-wrap">
            <button 
              onClick={handleToggleConversation} 
              className={`px-3 py-1 text-white rounded text-sm ${isRealtimeRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {isRealtimeRecording ? '关闭会话' : '开始会话'}
            </button>
            <button 
              onClick={handleToggleMute}
              className={`px-3 py-1 rounded text-sm ${isMuted ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              {isMuted ? '取消静音' : '静音'}
            </button>
          </div>
          <div className="text-sm text-gray-600">
            状态: {realtimeStatus}
            {realtimeError && <div className="text-red-500">错误: {realtimeError}</div>}
          </div>
        </div>

        {/* Messages Display */}
        <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
          {loading && <p>AI is thinking...</p>}
          {messages.map((msg, index) => (
            <div key={index} className={`mb-3 p-3 rounded-lg max-w-xl ${msg.sender === 'ai' ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900 ml-auto'}`}>
              {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              {msg.sender === 'ai' && (
                <button onClick={() => handlePlayAudio(msg.text)} className="mt-2 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* User Input */}
        <div className="flex items-center flex-shrink-0">
          <input type="text" className="flex-grow border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type your message..." value={userInput} onChange={(e) => setUserInput(e.target.value)} />
          <button onClick={handleListen} className={`p-2 border-y ${isListening ? 'bg-red-500 text-white' : 'bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-r-lg hover:bg-blue-700 transition-colors h-full">Send</button>
        </div>
      </div>
    </div>
  );
}