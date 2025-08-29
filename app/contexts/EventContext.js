"use client";

import React, { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * @typedef {Object} EventContextValue
 * @property {Array} loggedEvents
 * @property {function(Object, string=): void} logClientEvent
 * @property {function(Object, string=): void} logServerEvent
 * @property {function(any): void} logHistoryItem
 * @property {function(number|string): void} toggleExpand
 */

/** @type {React.Context<EventContextValue | undefined>} */
const EventContext = createContext(undefined);

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const EventProvider = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState([]);

  /**
   * @param {'client'|'server'} direction
   * @param {string} eventName
   * @param {Object} eventData
   */
  function addLoggedEvent(direction, eventName, eventData) {
    const id = eventData.event_id || uuidv4();
    setLoggedEvents((prev) => [
      ...prev,
      {
        id,
        direction,
        eventName,
        eventData,
        timestamp: new Date().toLocaleTimeString(),
        expanded: false,
      },
    ]);
  }

  /**
   * @param {Object} eventObj
   * @param {string} [eventNameSuffix='']
   */
  const logClientEvent = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("client", name, eventObj);
  };

  /**
   * @param {Object} eventObj
   * @param {string} [eventNameSuffix='']
   */
  const logServerEvent = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("server", name, eventObj);
  };

  /**
   * @param {any} item
   */
  const logHistoryItem = (item) => {
    let eventName = item.type;
    if (item.type === 'message') {
      eventName = `${item.role}.${item.status}`;
    }
    if (item.type === 'function_call') {
      eventName = `function.${item.name}.${item.status}`;
    }
    addLoggedEvent('server', eventName, item);
  };

  /**
   * @param {number|string} id
   */
  const toggleExpand = (id) => {
    setLoggedEvents((prev) =>
      prev.map((log) => {
        if (log.id === id) {
          return { ...log, expanded: !log.expanded };
        }
        return log;
      })
    );
  };

  return (
    <EventContext.Provider
      value={{ loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}