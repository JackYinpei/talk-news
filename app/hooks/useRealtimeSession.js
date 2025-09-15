import { useCallback, useRef, useState, useEffect } from 'react';
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { audioFormatForCodec, applyCodecPreferences } from '../lib/codecUtils';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';

/**
 * @typedef {Object} RealtimeSessionCallbacks
 * @property {function(string): void} [onConnectionChange] - Connection status change callback
 * @property {function(string): void} [onAgentHandoff] - Agent handoff callback
 */

/**
 * @typedef {Object} ConnectOptions
 * @property {function(): Promise<string>} getEphemeralKey - Function to get ephemeral key
 * @property {RealtimeAgent[]} initialAgents - Array of initial agents
 * @property {HTMLAudioElement} [audioElement] - Optional audio element
 * @property {Object} [extraContext] - Extra context data
 * @property {any[]} [outputGuardrails] - Output guardrails array
 */

/**
 * Hook for managing realtime session connection and communication
 * @param {RealtimeSessionCallbacks} callbacks - Callback functions
 * @returns {Object} Session methods and status
 */
export function useRealtimeSession(callbacks = {}) {
  /** @type {import('react').MutableRefObject<RealtimeSession|null>} */
  const sessionRef = useRef(null);
  /** @type {[string, function(string): void]} */
  const [status, setStatus] = useState('DISCONNECTED');
  const { logClientEvent } = useEvent();

  const updateStatus = useCallback(
    (s) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks, logClientEvent],
  );

  const { logServerEvent } = useEvent();

  const historyHandlers = useHandleSessionHistory().current;

  /**
   * Handle transport events from the session
   * @param {*} event - Transport event
   */
  function handleTransportEvent(event) {
    // Handle additional server events that aren't managed by the session
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        historyHandlers.handleTranscriptionCompleted(event);
        break;
      }
      case "response.audio_transcript.done": {
        historyHandlers.handleTranscriptionCompleted(event);
        break;
      }
      case "response.audio_transcript.delta": {
        historyHandlers.handleTranscriptionDelta(event);
        break;
      }
      default: {
        logServerEvent(event);
        break;
      } 
    }
  }

  const codecParamRef = useRef(
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('codec') ?? 'opus')
      : 'opus')
      .toLowerCase(),
  );

  // Wrapper to pass current codec param
  const applyCodec = useCallback(
    (pc) => applyCodecPreferences(pc, codecParamRef.current),
    [applyCodecPreferences],
  );

  /**
   * Handle agent handoff event
   * @param {*} item - Handoff item
   */
  const handleAgentHandoff = (item) => {
    const history = item.context.history;
    const lastMessage = history[history.length - 1];
    const agentName = lastMessage.name.split("transfer_to_")[1];
    callbacks.onAgentHandoff?.(agentName);
  };

  useEffect(() => {
    if (sessionRef.current) {
      // Log server errors
      sessionRef.current.on("error", (...args) => {
        logServerEvent({
          type: "error",
          message: args[0],
        });
      });

      // history events
      sessionRef.current.on("agent_handoff", handleAgentHandoff);
      sessionRef.current.on("agent_tool_start", historyHandlers.handleAgentToolStart);
      sessionRef.current.on("agent_tool_end", historyHandlers.handleAgentToolEnd);
      sessionRef.current.on("history_updated", historyHandlers.handleHistoryUpdated);
      sessionRef.current.on("history_added", historyHandlers.handleHistoryAdded);
      sessionRef.current.on("guardrail_tripped", historyHandlers.handleGuardrailTripped);

      // additional transport events
      sessionRef.current.on("transport_event", handleTransportEvent);
    }
  }, [sessionRef.current, handleAgentHandoff, handleTransportEvent, historyHandlers.handleAgentToolEnd, historyHandlers.handleAgentToolStart, historyHandlers.handleGuardrailTripped, historyHandlers.handleHistoryAdded, historyHandlers.handleHistoryUpdated, logServerEvent]);

  /**
   * Connect to realtime session
   * @param {ConnectOptions} options - Connection options
   */
  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
      outputGuardrails,
    }) => {
      if (sessionRef.current) return; // already connected

      updateStatus('CONNECTING');

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      // This lets you use the codec selector in the UI to force narrow-band (8 kHz) codecs to
      //  simulate how the voice agent sounds over a PSTN/SIP phone call.
      const codecParam = codecParamRef.current;
      const audioFormat = audioFormatForCodec(codecParam);

      sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          // Set preferred codec before offer creation
          changePeerConnection: async (pc) => {
            applyCodec(pc);
            return pc;
          },
        }),
        model: 'gpt-4o-realtime-preview-2025-06-03',
        config: {
          inputAudioFormat: audioFormat,
          outputAudioFormat: audioFormat,
          inputAudioTranscription: {
            model: 'gpt-4o-mini-transcribe',
          },
        },
        outputGuardrails: outputGuardrails ?? [],
        context: extraContext ?? {},
      });

      await sessionRef.current.connect({ apiKey: ek });
      updateStatus('CONNECTED');
    },
    [updateStatus, applyCodec],
  );

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  /**
   * Assert that session is connected
   * @throws {Error} If session is not connected
   */
  const assertconnected = () => {
    if (!sessionRef.current) throw new Error('RealtimeSession not connected');
    if (status !== 'CONNECTED') throw new Error('WebRTC data channel is not connected. Make sure you call `connect()` before sending events.');
  };

  /* ----------------------- message helpers ------------------------- */

  const interrupt = useCallback(() => {
    if (status === 'CONNECTED' && sessionRef.current) {
      sessionRef.current.interrupt();
    }
  }, [status]);
  
  /**
   * Send user text message
   * @param {string} text - Text to send
   */
  const sendUserText = useCallback((text) => {
    assertconnected();
    sessionRef.current.sendMessage(text);
  }, [assertconnected]);

  /**
   * Send event to session
   * @param {*} ev - Event to send
   */
  const sendEvent = useCallback((ev) => {
    if (status === 'CONNECTED' && sessionRef.current?.transport) {
      sessionRef.current.transport.sendEvent(ev);
    } else {
      console.warn('Cannot send event: WebRTC connection not established');
    }
  }, [status]);

  /**
   * Mute/unmute session
   * @param {boolean} m - Mute state
   */
  const mute = useCallback((m) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.clear' });
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.commit' });
    sessionRef.current.transport.sendEvent({ type: 'response.create' });
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  };
}