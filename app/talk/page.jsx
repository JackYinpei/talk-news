"use client";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "@/app/components/Transcript";
import Events from "@/app/components/Events";
import BottomToolbar from "@/app/components/BottomToolbar";
import NewsFeed from "@/app/components/NewsFeed";


// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { customerServiceRetailScenario } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorScenario } from "@/app/agentConfigs/chatSupervisor";
import { chatLearnScenario } from "@/app/agentConfigs/chatLearn";
import { customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";
import { simpleHandoffScenario } from "@/app/agentConfigs/simpleHandoff";

/**
 * Map used by connect logic for scenarios defined via the SDK.
 * @type {Record<string, Array<Object>>}
 */
const sdkScenarioMap = {
    simpleHandoff: simpleHandoffScenario,
    customerServiceRetail: customerServiceRetailScenario,
    chatSupervisor: chatSupervisorScenario,
    chatLearn: chatLearnScenario,
    default: chatLearnScenario,
};

import useAudioDownload from "@/app/hooks/useAudioDownload";
import { useHandleSessionHistory } from "@/app/hooks/useHandleSessionHistory";

/**
 * Main App component that handles the Realtime API connection, agent management,
 * WebRTC audio processing, and UI state management.
 * @returns {JSX.Element} The main application component
 */
function App() {
    // ---------------------------------------------------------------------
    // Codec selector – lets you toggle between wide-band Opus (48 kHz)
    // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
    // a traditional phone line and to validate ASR / VAD behaviour under that
    // constraint.
    //
    // We read the `?codec=` query-param and rely on the `changePeerConnection`
    // hook (configured in `useRealtimeSession`) to set the preferred codec
    // before the offer/answer negotiation.
    // ---------------------------------------------------------------------
    const urlCodec = "opus";

    // Agents SDK doesn't currently support codec selection so it is now forced 
    // via global codecPatch at module load 

    const {
        addTranscriptMessage,
        addTranscriptBreadcrumb,
    } = useTranscript();
    const { logClientEvent, logServerEvent } = useEvent();

    const [selectedNews, setSelectedNews] = useState(null)

    useEffect(()=>{

        if (selectedNews) {
            interrupt();
            try {
                sendUserText(`Let's discuss the following news article together. Please help me learn English by asking questions about it and correcting my mistakes. Here is the article: ${selectedNews.originalTitle || selectedNews.title} - ${selectedNews.description}`);
            } catch (err) {
                console.error('Failed to send via SDK', err);
            }
        }

    }, [selectedNews])

    /** @type {[string, function]} */
    const [selectedAgentName, setSelectedAgentName] = useState("");
    /** @type {[Array<Object>|null, function]} */
    const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState(null);

    const audioElementRef = useRef(null);
    // Ref to identify whether the latest agent switch came from an automatic handoff
    const handoffTriggeredRef = useRef(false);

    const sdkAudioElement = React.useMemo(() => {
        if (typeof window === 'undefined') return undefined;
        const el = document.createElement('audio');
        el.autoplay = true;
        el.style.display = 'none';
        document.body.appendChild(el);
        return el;
    }, []);

    // Attach SDK audio element once it exists (after first render in browser)
    useEffect(() => {
        if (sdkAudioElement && !audioElementRef.current) {
            audioElementRef.current = sdkAudioElement;
        }
    }, [sdkAudioElement]);

    const {
        connect,
        disconnect,
        sendUserText,
        sendEvent,
        interrupt,
        mute,
    } = useRealtimeSession({
        onConnectionChange: (s) => setSessionStatus(s),
        onAgentHandoff: (agentName) => {
            handoffTriggeredRef.current = true;
            setSelectedAgentName(agentName);
        },
    });

    /** @type {[string, function]} */
    const [sessionStatus, setSessionStatus] = useState("DISCONNECTED");

    /** @type {[boolean, function]} */
    const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState(true);
    /** @type {[string, function]} */
    const [userText, setUserText] = useState("");
    /** @type {[boolean, function]} */
    const [isPTTActive, setIsPTTActive] = useState(false);
    /** @type {[boolean, function]} */
    const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState(false);
    /** @type {[boolean, function]} */
    const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState(
        () => {
            if (typeof window === 'undefined') return true;
            const stored = localStorage.getItem('audioPlaybackEnabled');
            return stored ? stored === 'true' : true;
        },
    );

    // Initialize the recording hook.
    const { startRecording, stopRecording, downloadRecording } = useAudioDownload();

    /**
     * Send a client event to both the SDK and event logging
     * @param {Object} eventObj - The event object to send
     * @param {string} eventNameSuffix - Optional suffix for event name
     */
    const sendClientEvent = (eventObj, eventNameSuffix = "") => {
        try {
            sendEvent(eventObj);
            logClientEvent(eventObj, eventNameSuffix);
        } catch (err) {
            console.error('Failed to send via SDK', err);
        }
    };

    useHandleSessionHistory();

    useEffect(() => {
        const agents = allAgentSets["default"];
        const agentKeyToUse = agents[0]?.name || "";

        setSelectedAgentName(agentKeyToUse);
        setSelectedAgentConfigSet(agents);
    }, []);

    useEffect(() => {
        if (selectedAgentName && sessionStatus === "DISCONNECTED") {
            connectToRealtime();
        }
    }, [selectedAgentName]);

    useEffect(() => {
        if (
            sessionStatus === "CONNECTED" &&
            selectedAgentConfigSet &&
            selectedAgentName
        ) {
            const currentAgent = selectedAgentConfigSet.find(
                (a) => a.name === selectedAgentName
            );
            addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
            updateSession(!handoffTriggeredRef.current);
            // Reset flag after handling so subsequent effects behave normally
            handoffTriggeredRef.current = false;
        }
    }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

    useEffect(() => {
        if (sessionStatus === "CONNECTED") {
            updateSession();
        }
    }, [isPTTActive]);

    /**
     * Fetch ephemeral key from the server for authentication
     * @returns {Promise<string|null>} The ephemeral key or null if failed
     */
    const fetchEphemeralKey = async () => {
        logClientEvent({ url: "/session" }, "fetch_session_token_request");
        const tokenResponse = await fetch("/api/session");
        const data = await tokenResponse.json();
        logServerEvent(data, "fetch_session_token_response");

        if (!data.client_secret?.value) {
            logClientEvent(data, "error.no_ephemeral_key");
            console.error("No ephemeral key provided by the server");
            setSessionStatus("DISCONNECTED");
            return null;
        }

        return data.client_secret.value;
    };

    /**
     * Connect to the Realtime API with the selected agent configuration
     */
    const connectToRealtime = async () => {
        const agentSetKey = "default";
        if (sdkScenarioMap[agentSetKey]) {
            if (sessionStatus !== "DISCONNECTED") return;
            setSessionStatus("CONNECTING");

            try {
                const EPHEMERAL_KEY = await fetchEphemeralKey();
                if (!EPHEMERAL_KEY) return;

                // Ensure the selectedAgentName is first so that it becomes the root
                const reorderedAgents = [...sdkScenarioMap[agentSetKey]];
                const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
                if (idx > 0) {
                    const [agent] = reorderedAgents.splice(idx, 1);
                    reorderedAgents.unshift(agent);
                }

                const companyName = agentSetKey === 'customerServiceRetail'
                    ? customerServiceRetailCompanyName
                    : chatSupervisorCompanyName;
                const guardrail = createModerationGuardrail(companyName);

                await connect({
                    getEphemeralKey: async () => EPHEMERAL_KEY,
                    initialAgents: reorderedAgents,
                    audioElement: sdkAudioElement,
                    outputGuardrails: [guardrail],
                    extraContext: {
                        addTranscriptBreadcrumb,
                    },
                });
            } catch (err) {
                console.error("Error connecting via SDK:", err);
                setSessionStatus("DISCONNECTED");
            }
            return;
        }
    };

    /**
     * Disconnect from the Realtime API
     */
    const disconnectFromRealtime = () => {
        disconnect();
        setSessionStatus("DISCONNECTED");
        setIsPTTUserSpeaking(false);
    };

    /**
     * Send a simulated user message to the agent
     * @param {string} text - The message text to send
     */
    const sendSimulatedUserMessage = (text) => {
        const id = uuidv4().slice(0, 32);
        addTranscriptMessage(id, "user", text, true);

        sendClientEvent({
            type: 'conversation.item.create',
            item: {
                id,
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text }],
            },
        });
        sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
    };

    /**
     * Update the session configuration with current settings
     * @param {boolean} shouldTriggerResponse - Whether to trigger an initial response
     */
    const updateSession = (shouldTriggerResponse = false) => {
        // Reflect Push-to-Talk UI state by (de)activating server VAD on the
        // backend. The Realtime SDK supports live session updates via the
        // `session.update` event.
        const turnDetection = isPTTActive
            ? null
            : {
                type: 'server_vad',
                threshold: 0.9,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
            };

        sendEvent({
            type: 'session.update',
            session: {
                turn_detection: turnDetection,
            },
        });

        // Send an initial 'hi' message to trigger the agent to greet the user
        if (shouldTriggerResponse) {
            sendSimulatedUserMessage('hi');
        }
        return;
    }

    /**
     * Handle sending text message from the user input
     */
    const handleSendTextMessage = () => {
        if (!userText.trim()) return;
        interrupt();

        try {
            sendUserText(userText.trim());
        } catch (err) {
            console.error('Failed to send via SDK', err);
        }

        setUserText("");
    };

    /**
     * Handle push-to-talk button press down
     */
    const handleTalkButtonDown = () => {
        if (sessionStatus !== 'CONNECTED') return;
        interrupt();

        setIsPTTUserSpeaking(true);
        sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

        // No placeholder; we'll rely on server transcript once ready.
    };

    /**
     * Handle push-to-talk button release
     */
    const handleTalkButtonUp = () => {
        if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
            return;

        setIsPTTUserSpeaking(false);
        sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
        sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
    };

    /**
     * Toggle connection to the Realtime API
     */
    const onToggleConnection = () => {
        if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
            disconnectFromRealtime();
            setSessionStatus("DISCONNECTED");
        } else {
            connectToRealtime();
        }
    };

    /**
     * Handle agent configuration change
     * @param {React.ChangeEvent<HTMLSelectElement>} e - The select element change event
     */
    const handleAgentChange = (e) => {
        const newAgentConfig = e.target.value;
        console.log("Switching to agent config:", newAgentConfig);

    };

    /**
     * Handle selected agent change within the same configuration
     * @param {React.ChangeEvent<HTMLSelectElement>} e - The select element change event
     */
    const handleSelectedAgentChange = (e) => {
        const newAgentName = e.target.value;
        // Reconnect session with the newly selected agent as root so that tool
        // execution works correctly.
        disconnectFromRealtime();
        setSelectedAgentName(newAgentName);
        // connectToRealtime will be triggered by effect watching selectedAgentName
    };

    /**
     * Handle codec change - requires page refresh for new connection
     * @param {string} newCodec - The new codec to use
     */
    const handleCodecChange = (newCodec) => {
        console.log("Codec change requested:", newCodec);
    };

    useEffect(() => {
        const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
        if (storedPushToTalkUI) {
            setIsPTTActive(storedPushToTalkUI === "true");
        }
        const storedLogsExpanded = localStorage.getItem("logsExpanded");
        if (storedLogsExpanded) {
            setIsEventsPaneExpanded(storedLogsExpanded === "true");
        }
        const storedAudioPlaybackEnabled = localStorage.getItem(
            "audioPlaybackEnabled"
        );
        if (storedAudioPlaybackEnabled) {
            setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("pushToTalkUI", isPTTActive.toString());
    }, [isPTTActive]);

    useEffect(() => {
        localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
    }, [isEventsPaneExpanded]);

    useEffect(() => {
        localStorage.setItem(
            "audioPlaybackEnabled",
            isAudioPlaybackEnabled.toString()
        );
    }, [isAudioPlaybackEnabled]);

    useEffect(() => {
        if (audioElementRef.current) {
            if (isAudioPlaybackEnabled) {
                audioElementRef.current.muted = false;
                audioElementRef.current.play().catch((err) => {
                    console.warn("Autoplay may be blocked by browser:", err);
                });
            } else {
                // Mute and pause to avoid brief audio blips before pause takes effect.
                audioElementRef.current.muted = true;
                audioElementRef.current.pause();
            }
        }

        // Toggle server-side audio stream mute so bandwidth is saved when the
        // user disables playback. 
        try {
            mute(!isAudioPlaybackEnabled);
        } catch (err) {
            console.warn('Failed to toggle SDK mute', err);
        }
    }, [isAudioPlaybackEnabled]);

    // Ensure mute state is propagated to transport right after we connect or
    // whenever the SDK client reference becomes available.
    useEffect(() => {
        if (sessionStatus === 'CONNECTED') {
            try {
                mute(!isAudioPlaybackEnabled);
            } catch (err) {
                console.warn('mute sync after connect failed', err);
            }
        }
    }, [sessionStatus, isAudioPlaybackEnabled]);

    useEffect(() => {
        if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
            // The remote audio stream from the audio element.
            /** @type {MediaStream} */
            const remoteStream = audioElementRef.current.srcObject;
            startRecording(remoteStream);
        }

        // Clean up on unmount or when sessionStatus is updated.
        return () => {
            stopRecording();
        };
    }, [sessionStatus]);

    const agentSetKey = "default";

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-card-foreground">English Learning Hub</h1>
                    <p className="text-muted-foreground mt-1">Learn English through news and AI conversation</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
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
                    <div className="flex-1 lg:w-[70%] flex flex-col">
                        <Transcript
                            userText={userText}
                            setUserText={setUserText}
                            onSendMessage={handleSendTextMessage}
                            downloadRecording={downloadRecording}
                            canSend={sessionStatus === "CONNECTED"}
                            selectedNews={selectedNews}
                            sessionStatus={sessionStatus}
                            onToggleConnection={onToggleConnection}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;