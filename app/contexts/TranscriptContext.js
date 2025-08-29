"use client";

import React, {
  createContext,
  useContext,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * @typedef {Object} TranscriptContextValue
 * @property {Array} transcriptItems
 * @property {function(string, 'user'|'assistant', string, boolean=): void} addTranscriptMessage
 * @property {function(string, string, boolean): void} updateTranscriptMessage
 * @property {function(string, Object=): void} addTranscriptBreadcrumb
 * @property {function(string): void} toggleTranscriptItemExpand
 * @property {function(string, Object): void} updateTranscriptItem
 */

/** @type {React.Context<TranscriptContextValue | undefined>} */
const TranscriptContext = createContext(undefined);

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const TranscriptProvider = ({ children }) => {
  const [transcriptItems, setTranscriptItems] = useState([]);

  /**
   * @returns {string}
   */
  function newTimestampPretty() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = now.getMilliseconds().toString().padStart(3, "0");
    return `${time}.${ms}`;
  }

  /**
   * @param {string} itemId
   * @param {'user'|'assistant'} role
   * @param {string} text
   * @param {boolean} [isHidden=false]
   */
  const addTranscriptMessage = (itemId, role, text = "", isHidden = false) => {
    setTranscriptItems((prev) => {
      if (prev.some((log) => log.itemId === itemId && log.type === "MESSAGE")) {
        console.warn(`[addTranscriptMessage] skipping; message already exists for itemId=${itemId}, role=${role}, text=${text}`);
        return prev;
      }

      const newItem = {
        itemId,
        type: "MESSAGE",
        role,
        title: text,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "IN_PROGRESS",
        isHidden,
      };

      return [...prev, newItem];
    });
  };

  /**
   * @param {string} itemId
   * @param {string} newText
   * @param {boolean} append
   */
  const updateTranscriptMessage = (itemId, newText, append = false) => {
    setTranscriptItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId && item.type === "MESSAGE") {
          return {
            ...item,
            title: append ? (item.title ?? "") + newText : newText,
          };
        }
        return item;
      })
    );
  };

  /**
   * @param {string} title
   * @param {Object} [data]
   */
  const addTranscriptBreadcrumb = (title, data) => {
    setTranscriptItems((prev) => [
      ...prev,
      {
        itemId: `breadcrumb-${uuidv4()}`,
        type: "BREADCRUMB",
        title,
        data,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "DONE",
        isHidden: false,
      },
    ]);
  };

  /**
   * @param {string} itemId
   */
  const toggleTranscriptItemExpand = (itemId) => {
    setTranscriptItems((prev) =>
      prev.map((log) =>
        log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  /**
   * @param {string} itemId
   * @param {Object} updatedProperties
   */
  const updateTranscriptItem = (itemId, updatedProperties) => {
    setTranscriptItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, ...updatedProperties } : item
      )
    );
  };

  return (
    <TranscriptContext.Provider
      value={{
        transcriptItems,
        addTranscriptMessage,
        updateTranscriptMessage,
        addTranscriptBreadcrumb,
        toggleTranscriptItemExpand,
        updateTranscriptItem,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
};

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (!context) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}