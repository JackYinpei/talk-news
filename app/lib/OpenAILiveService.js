export class OpenAILiveServiceImpl {
    constructor(config) {
        this.config = config;
        this.pc = null;
        this.dc = null;
        this.mediaStream = null;
        this.audioEl = null;

        this.systemInstruction = "";
        this.isMuted = false;

        // State for tracking generated tool calls and streaming text
        this.currentAssistantMessage = "";
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }

    async connect(systemInstruction, token) {
        this.systemInstruction = systemInstruction;

        if (!token) {
            this.config.onError("No Token provided");
            return;
        }

        try {
            this.pc = new RTCPeerConnection();

            // Set up audio play
            this.audioEl = new Audio();
            this.audioEl.autoplay = true;

            this.pc.ontrack = (e) => {
                this.audioEl.srcObject = e.streams[0];
            };

            // Setup Data Channel for Events
            this.dc = this.pc.createDataChannel("oai-events");

            this.dc.onopen = () => {
                this.config.onConnectionUpdate(true);
                this.updateSession();
            };

            this.dc.onclose = () => {
                console.log("OpenAI realtime DataChannel closed");
                this.disconnect();
            };

            this.dc.onerror = (e) => {
                console.error("DataChannel error", e);
                this.config.onError("DataChannel Error");
            };

            this.dc.onmessage = this.handleServerMessage.bind(this);

            // Add local mic
            try {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaStream.getAudioTracks().forEach(track => {
                    this.pc.addTrack(track, this.mediaStream);
                    track.enabled = !this.isMuted;
                });
            } catch (err) {
                console.error("Mic Access Error", err);
                this.config.onError("Could not access microphone.");
                return;
            }

            // Create Offer
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);

            // Fetch Answer via ephemeral token
            const baseUrl = "https://api.openai.com/v1/realtime";
            const model = "gpt-4o-realtime-preview-2024-12-17";
            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/sdp"
                },
                body: offer.sdp
            });

            if (!sdpResponse.ok) {
                const text = await sdpResponse.text();
                throw new Error(`SDP Exchange Failed: ${sdpResponse.status} ${text}`);
            }

            const answerSdp = await sdpResponse.text();
            await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

        } catch (e) {
            console.error("WebRTC Connection Error", e);
            this.config.onError("Connection Failed: " + (e.message || "Unknown error"));
            this.disconnect();
        }
    }

    updateSession() {
        if (!this.dc || this.dc.readyState !== "open") return;

        const sessionUpdateParams = {
            type: "session.update",
            session: {
                instructions: this.systemInstruction,
                input_audio_transcription: {
                    model: "whisper-1"
                },
                turn_detection: {
                    type: "server_vad"
                },
                tools: [
                    {
                        type: "function",
                        name: "extract_unfamiliar_english",
                        description: "Aggressive MODE: Call this tool AGGRESSIVELY whenever the above history contains ANY English (full sentence, a single word, code comments, or CN-EN mixed). Even if the user does NOT explicitly ask about a word, scan for potentially unfamiliar vocabulary, phrases, collocations, idioms, phrasal verbs, or grammar patterns",
                        parameters: {
                            type: "object",
                            properties: {
                                userMessage: { type: "string" },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            text: { type: "string" },
                                            type: { type: "string", enum: ["word", "phrase", "grammar", "other"] }
                                        },
                                        required: ["text", "type"]
                                    }
                                },
                                context: { type: "string" }
                            },
                            required: ["userMessage", "items"]
                        }
                    }
                ]
            }
        };

        this.dc.send(JSON.stringify(sessionUpdateParams));
    }

    async handleServerMessage(e) {
        const msg = JSON.parse(e.data);

        switch (msg.type) {
            // User spoken transcript
            case "conversation.item.input_audio_transcription.completed":
                if (msg.transcript) {
                    this.config.onMessage(msg.transcript, true, "user");
                }
                break;

            // AI Text Stream
            case "response.audio_transcript.delta":
                if (msg.delta) {
                    this.config.onMessage(msg.delta, false, "model");
                }
                break;
            case "response.audio_transcript.done":
                if (msg.transcript) {
                    // Force final
                    this.config.onMessage("", true, "model");
                }
                break;
            case "response.text.delta":
                if (msg.delta) {
                    this.config.onMessage(msg.delta, false, "model");
                }
                break;
            case "response.text.done":
                if (msg.text) {
                    this.config.onMessage("", true, "model");
                }
                break;

            // AI Finished (sometimes Audio only)
            case "response.output_item.done":
                this.config.onMessage("", true, "model");
                break;

            // Tool calling
            case "response.function_call_arguments.done":
                if (msg.name === "extract_unfamiliar_english") {
                    try {
                        const args = JSON.parse(msg.arguments);
                        await this.handleExtractUnfamiliarEnglish(args, msg.call_id);
                    } catch (err) {
                        console.error("Failed to parse function args", err);
                    }
                }
                break;

            case "error":
                console.error("Server error:", msg.error);
                break;
        }
    }

    async handleExtractUnfamiliarEnglish(args, callId) {
        console.log('OpenAI requested tool: extract_unfamiliar_english', args);
        try {
            const res = await fetch('/api/learning/unfamiliar-english', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: args.items,
                    context: args.context,
                    timestamp: new Date().toISOString(),
                    userMessage: args.userMessage ?? null,
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (this.dc && this.dc.readyState === "open") {
                this.dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: callId,
                        output: JSON.stringify({
                            result: "saved",
                            data
                        })
                    }
                }));

                // Ask the model to generate a response now that tool output is provided
                this.dc.send(JSON.stringify({
                    type: "response.create"
                }));
            }
        } catch (e) {
            console.error('Error executing extract_unfamiliar_english:', e);
            if (this.dc && this.dc.readyState === "open") {
                this.dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: callId,
                        output: JSON.stringify({ error: String(e) })
                    }
                }));
                this.dc.send(JSON.stringify({ type: "response.create" }));
            }
        }
    }

    async sendText(text) {
        if (!this.dc || this.dc.readyState !== "open") return;

        // Optimistically update UI
        this.config.onMessage(text, true, 'user');

        this.dc.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text }]
            }
        }));

        this.dc.send(JSON.stringify({ type: "response.create" }));
    }

    async sendContextMessage(text) {
        if (!this.dc || this.dc.readyState !== "open") return;

        this.dc.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
                type: "message",
                role: "system", // context message
                content: [{ type: "input_text", text }]
            }
        }));

        // Do not force response.create immediately to act like Gemini's implementation
    }

    disconnect() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
        }
        if (this.dc) {
            this.dc.close();
            this.dc = null;
        }
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        if (this.audioEl) {
            this.audioEl.srcObject = null;
            this.audioEl = null;
        }

        this.config.onConnectionUpdate(false);
    }
}
