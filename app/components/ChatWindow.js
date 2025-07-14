'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { GoogleGenAI, Modality } from '@google/genai';

// 音频处理工具函数
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
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
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
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }
  // Extract interleaved channels
  if (numChannels === 1) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i,
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
};

export default function ChatWindow({ article }) {
  const { nativeLanguage, targetLanguage } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRealtimeRecording, setIsRealtimeRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [realtimeStatus, setRealtimeStatus] = useState('');
  const [realtimeError, setRealtimeError] = useState('');
  
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

  // 初始化实时音频
  useEffect(() => {
    initRealtimeAudio();
    return () => {
      // 清理资源
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initRealtimeAudio = async () => {
    try {
      // 初始化音频上下文
      inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      
      inputNodeRef.current = inputAudioContextRef.current.createGain();
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

      // 初始化Google GenAI客户端
      clientRef.current = new GoogleGenAI({
        // 注意：这里需要设置你的API Key，生产环境中应该从环境变量获取
        apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY, // 请替换为你的实际API Key
      });

      setRealtimeStatus('实时音频已初始化');
    } catch (error) {
      console.error('初始化实时音频失败:', error);
      setRealtimeError('初始化失败: ' + error.message);
    }
  };

  const initRealtimeSession = async () => {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';

    try {
      sessionRef.current = await clientRef.current.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            setRealtimeStatus('连接已建立');
          },
          onmessage: async (message) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContextRef.current.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                outputAudioContextRef.current,
                24000,
                1,
              );
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.log('创建连接时onerror', e);
            setRealtimeError(e.message);
          },
          onclose: (e) => {
            console.log('创建连接时onclose', e);
            setRealtimeStatus('连接关闭: ' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
          },
          systemInstruction: `角色定义
你是一位专业的语言学习助手，专门帮助用户通过新闻内容学习目标语言。用户的母语是` + {nativeLanguage} + `，正在学习` + {targetLanguage} + `。
核心任务

新闻内容呈现：用` + {targetLanguage} + `介绍和讨论新闻主题及内容
实时语言辅助：识别用户可能不认识的单词和短语，用` + {nativeLanguage} + `进行解释
互动学习：鼓励用户用` + {targetLanguage} + `参与讨论，并给予适当的语言指导

具体执行方式
新闻呈现格式

首先用` + {targetLanguage} + `简要介绍新闻主题
用` + {targetLanguage} + `详细讲述新闻内容
在介绍过程中，对可能的生词用以下格式标注：
[` + {targetLanguage} + ` 单词/短语]（` + {nativeLanguage} + ` 解释）


互动指导原则

词汇解释：

自动识别中高级词汇、专业术语、惯用表达
用` + {nativeLanguage} + `提供清晰、准确的解释
必要时提供例句帮助理解


语法提示：

遇到复杂语法结构时，用` + {nativeLanguage} + `简要说明
重点关注` + {targetLanguage} + `的特殊语法现象


文化背景：

涉及文化特定概念时，用` + {nativeLanguage} + `补充背景信息



对话流程

询问用户感兴趣的新闻类型或话题
选择合适的新闻内容进行介绍
在介绍过程中实时提供语言辅助
鼓励用户用「target language」提问或发表看法
纠正用户的语言错误，并给予鼓励性反馈

示例对话结构
AI: 今天我想和你分享一条关于` + {article} + `的消息。

[用` + {targetLanguage} + `介绍新闻，关键词汇用` + {nativeLanguage} + `标注]

你对这个话题有什么看法吗？请尝试用` + {targetLanguage} + `来表达。

用户: [用户回应]

AI: [用` + {targetLanguage} + `回应，同时纠正语言错误，鼓励继续对话]
注意事项

保持耐心和鼓励的态度
根据用户的语言水平调整难度
平衡语言学习和新闻内容的比重
营造轻松愉快的学习氛围
适时询问用户是否需要更多解释或想讨论其他话题

现在，让我们开始今天的新闻语言学习之旅吧！你希望了解哪个领域的新闻呢？`,
        },
      });
    } catch (e) {
      console.log('创建会话失败:', e);
      setRealtimeError('创建会话失败: ' + e.message);
    }
  };

  const startRealtimeRecording = async () => {
    if (isRealtimeRecording) {
      return;
    }

    if (!sessionRef.current) {
      await initRealtimeSession();
    }

    inputAudioContextRef.current.resume();
    outputAudioContextRef.current.resume();
    setRealtimeStatus('请求麦克风权限...');

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      setRealtimeStatus('麦克风权限已授予，开始捕获...');

      sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      sourceNodeRef.current.connect(inputNodeRef.current);

      const bufferSize = 256;
      scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

      scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
        if (!isRecordingRef.current) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        if (sessionRef.current) {
          sessionRef.current.sendRealtimeInput({ media: createBlob(pcmData) });
        }
      };

      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);

      isRecordingRef.current = true;
      setIsRealtimeRecording(true);
      setRealtimeStatus('🔴 正在录音... 实时对话中');
    } catch (err) {
      console.error('开始录音时出错:', err);
      setRealtimeStatus(`错误: ${err.message}`);
      stopRealtimeRecording();
    }
  };

  const stopRealtimeRecording = () => {
    if (!isRealtimeRecording && !mediaStreamRef.current && !inputAudioContextRef.current) {
      return;
    }

    setRealtimeStatus('停止录音...');
    isRecordingRef.current = false;
    setIsRealtimeRecording(false);

    if (scriptProcessorNodeRef.current && sourceNodeRef.current && inputAudioContextRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    scriptProcessorNodeRef.current = null;
    sourceNodeRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setRealtimeStatus('录音已停止，点击开始进行新的对话');
  };

  const resetRealtimeSession = () => {
    sessionRef.current?.close();
    initRealtimeSession();
    setRealtimeStatus('会话已重置');
  };

  // 原有的文章初始化聊天功能
  useEffect(() => {
    if (article) {
      const initChat = async () => {
        setLoading(true);
        setMessages([]);
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
      initChat();
    }
  }, [article, targetLanguage]);

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

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  return (
    <div className="h-1/2 bg-white p-4 rounded-lg flex flex-col shadow">
      <h2 className="text-xl font-bold mb-4 text-gray-800">AI 聊天</h2>
      
      {/* 实时对话控制区域 */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-700">实时语音对话</h3>
        <div className="flex gap-2 mb-2">
          <button
            onClick={resetRealtimeSession}
            disabled={isRealtimeRecording}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
          >
            重置会话
          </button>
          <button
            onClick={startRealtimeRecording}
            disabled={isRealtimeRecording}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
          >
            开始录音
          </button>
          <button
            onClick={stopRealtimeRecording}
            disabled={!isRealtimeRecording}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
          >
            停止录音
          </button>
        </div>
        <div className="text-sm text-gray-600">
          状态: {realtimeStatus}
          {realtimeError && <div className="text-red-500">错误: {realtimeError}</div>}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
        {loading && <p>AI is thinking...</p>}
        {!article && !loading && <p className="text-gray-500">Select an article to start a conversation.</p>}
        {messages.map((msg, index) => (
          <div key={index} className={`mb-3 p-3 rounded-lg max-w-xl ${msg.sender === 'ai' ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900 ml-auto'}`}>
            {msg.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            {msg.sender === 'ai' && (
              <button onClick={() => handlePlayAudio(msg.text)} className="mt-2 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center">
        <input 
          type="text" 
          className="flex-grow border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Type your message..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
        <button onClick={handleListen} className={`p-2 border-y ${isListening ? 'bg-red-500 text-white' : 'bg-gray-100'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-r-lg hover:bg-blue-700 transition-colors h-full">Send</button>
      </div>
    </div>
  );
}
