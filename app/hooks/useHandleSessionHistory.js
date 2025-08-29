"use client";

import { useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";

/**
 * Hook for handling session history events and updating transcript
 * @returns {Object} Reference to event handlers
 */
export function useHandleSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();

  /* ----------------------- helpers ------------------------- */

  /**
   * Extract text from content array
   * @param {Array} content - Content array
   * @returns {string} Extracted text
   */
  const extractMessageText = (content = []) => {
    if (!Array.isArray(content)) return "";

    return content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio") return c.transcript ?? "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  };

  /**
   * Extract function call by name from content
   * @param {string} name - Function name to find
   * @param {Array} content - Content array to search
   * @returns {*} Function call object or undefined
   */
  const extractFunctionCallByName = (name, content = []) => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c) => c.type === 'function_call' && c.name === name);
  };

  /**
   * Try to parse JSON string, return original value if parsing fails
   * @param {*} val - Value to parse
   * @returns {*} Parsed JSON or original value
   */
  const maybeParseJson = (val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        console.warn('Failed to parse JSON:', val);
        return val;
      }
    }
    return val;
  };

  /**
   * Extract last assistant message from history
   * @param {Array} history - History array
   * @returns {*} Last assistant message or undefined
   */
  const extractLastAssistantMessage = (history = []) => {
    if (!Array.isArray(history)) return undefined;
    return history.reverse().find((c) => c.type === 'message' && c.role === 'assistant');
  };

  /**
   * Recursively extract moderation info from object
   * @param {*} obj - Object to extract from
   * @returns {*} Moderation info
   */
  const extractModeration = (obj) => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModeration(obj.outputInfo);
    if ('output' in obj) return extractModeration(obj.output);
    if ('result' in obj) return extractModeration(obj.result);
  };

  /**
   * Temporary helper to detect guardrail message until the guardrail_tripped event includes the itemId
   * @param {string} text - Text to check for guardrail pattern
   * @returns {string|null} Extracted failure details or null
   */
  const sketchilyDetectGuardrailMessage = (text) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  /* ----------------------- event handlers ------------------------- */

  /**
   * Handle agent tool start event
   * @param {*} details - Event details
   * @param {*} _agent - Agent info
   * @param {*} functionCall - Function call info
   */
  function handleAgentToolStart(details, _agent, functionCall) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history);
    const function_name = lastFunctionCall?.name;
    const function_args = lastFunctionCall?.arguments;

    addTranscriptBreadcrumb(
      `function call: ${function_name}`,
      function_args
    );    
  }

  /**
   * Handle agent tool end event
   * @param {*} details - Event details
   * @param {*} _agent - Agent info
   * @param {*} _functionCall - Function call info
   * @param {*} result - Tool result
   */
  function handleAgentToolEnd(details, _agent, _functionCall, result) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history);
    addTranscriptBreadcrumb(
      `function call result: ${lastFunctionCall?.name}`,
      maybeParseJson(result)
    );
  }

  /**
   * Handle history added event
   * @param {*} item - History item
   */
  function handleHistoryAdded(item) {
    console.log("[handleHistoryAdded] ", item);
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content);

      if (isUser && !text) {
        text = "[Transcribing...]";
      }

      // If the guardrail has been tripped, this message is a message that gets sent to the 
      // assistant to correct it, so we add it as a breadcrumb instead of a message.
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
      }
    }
  }

  /**
   * Handle history updated event
   * @param {Array} items - Updated items
   */
  function handleHistoryUpdated(items) {
    console.log("[handleHistoryUpdated] ", items);
    items.forEach((item) => {
      if (!item || item.type !== 'message') return;

      const { itemId, content = [] } = item;

      const text = extractMessageText(content);

      if (text) {
        updateTranscriptMessage(itemId, text, false);
      }
    });
  }

  /**
   * Handle transcription delta event
   * @param {*} item - Transcription item
   */
  function handleTranscriptionDelta(item) {
    const itemId = item.item_id;
    const deltaText = item.delta || "";
    if (itemId) {
      updateTranscriptMessage(itemId, deltaText, true);
    }
  }

  /**
   * Handle transcription completed event
   * @param {*} item - Completed transcription item
   */
  function handleTranscriptionCompleted(item) {
    // History updates don't reliably end in a completed item, 
    // so we need to handle finishing up when the transcription is completed.
    const itemId = item.item_id;
    const finalTranscript =
        !item.transcript || item.transcript === "\n"
        ? "[inaudible]"
        : item.transcript;
    if (itemId) {
      updateTranscriptMessage(itemId, finalTranscript, false);
      // Use the ref to get the latest transcriptItems
      const transcriptItem = transcriptItems.find((i) => i.itemId === itemId);
      updateTranscriptItem(itemId, { status: 'DONE' });

      // If guardrailResult still pending, mark PASS.
      if (transcriptItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: 'DONE',
            category: 'NONE',
            rationale: '',
          },
        });
      }
    }
  }

  /**
   * Handle guardrail tripped event
   * @param {*} details - Event details
   * @param {*} _agent - Agent info
   * @param {*} guardrail - Guardrail info
   */
  function handleGuardrailTripped(details, _agent, guardrail) {
    console.log("[guardrail tripped]", details, _agent, guardrail);
    const moderation = extractModeration(guardrail.result.output.outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    // find the last assistant message in details.context.history
    const lastAssistant = extractLastAssistantMessage(details?.context?.history);

    if (lastAssistant && moderation) {
      const category = moderation.moderationCategory ?? 'NONE';
      const rationale = moderation.moderationRationale ?? '';
      /** @type {string|undefined} */
      const offendingText = moderation?.testText;

      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
  });

  return handlersRef;
}