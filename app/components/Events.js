"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";

/**
 * @typedef {Object} EventsProps
 * @property {boolean} isExpanded - Whether the events panel is expanded
 */

/**
 * Events panel component for displaying logged events
 * @param {EventsProps} props - Component props
 * @returns {JSX.Element} Events component
 */
function Events({ isExpanded }) {
  /** @type {[Array, function(Array): void]} */
  const [prevEventLogs, setPrevEventLogs] = useState([]);
  /** @type {import('react').MutableRefObject<HTMLDivElement|null>} */
  const eventLogsContainerRef = useRef(null);

  const { loggedEvents, toggleExpand } = useEvent();

  /**
   * Get direction arrow info for event display
   * @param {string} direction - Event direction (client/server)
   * @returns {Object} Arrow symbol and color
   */
  const getDirectionArrow = (direction) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded, prevEventLogs.length]);

  return (
    <div
      className={
        (isExpanded ? "w-1/2 overflow-auto" : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex flex-col bg-white shadow-sm border border-gray-200"
      }
      ref={eventLogsContainerRef}
    >
      {isExpanded && (
        <>
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b border-gray-200 bg-white rounded-t-xl">
            <span className="font-semibold text-gray-900">Logs</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loggedEvents.map((log, idx) => {
              const arrowInfo = getDirectionArrow(log.direction);
              const isError =
                log.eventName.toLowerCase().includes("error") ||
                log.eventData?.response?.status_details?.error != null;

              return (
                <div
                  key={`${log.id}-${idx}`}
                  className="border-b border-gray-100 py-2 px-6 font-mono hover:bg-gray-50 transition-colors"
                >
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <span
                        style={{ color: arrowInfo.color }}
                        className="ml-1 mr-2 flex-shrink-0"
                      >
                      {arrowInfo.symbol}
                      </span>
                      <span
                        className={
                          "flex-1 text-sm truncate " +
                          (isError ? "text-red-600" : "text-gray-800")
                        }
                        title={log.eventName}
                      >
                        {log.eventName}
                      </span>
                    </div>
                    <div className="text-gray-500 ml-2 text-xs whitespace-nowrap flex-shrink-0">
                      {log.timestamp}
                    </div>
                  </div>

                  {log.expanded && log.eventData && (
                    <div className="text-gray-800 text-left mt-2">
                      <pre className="border-l-2 ml-1 border-gray-300 whitespace-pre-wrap break-words font-mono text-xs mb-2 pl-3 bg-gray-50 rounded-r-md py-2">
                        {JSON.stringify(log.eventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Events;