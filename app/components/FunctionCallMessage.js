"use client";
import { useMemo, useState } from 'react';

import ClockIcon from '@/app/components/ClockIcon';
import FunctionsIcon from '@/app/components/FunctionsIcon';
import McpIcon from '@/app/components/McpIcon';

export function FunctionCallMessage({ message }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const parsedArgs = useMemo(() => {
    if (!message?.arguments) return null;
    try {
      return JSON.parse(message.arguments);
    } catch {
      return null;
    }
  }, [message?.arguments]);

  const items = Array.isArray(parsedArgs?.items) ? parsedArgs.items : [];
  const context =
    parsedArgs && typeof parsedArgs.context === 'string'
      ? parsedArgs.context
      : undefined;
  const itemTexts = items
    .map((item) =>
      item && typeof item.text === 'string' ? item.text.trim() : null
    )
    .filter(Boolean);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  return (
    <div className="flex flex-col w-[70%] mb-2">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex items-center justify-between rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow-md"
      >
        <div className="flex items-center gap-2 text-blue-500 fill-blue-500">
          {message.type === 'mcp_call' || message.type === 'mcp_tool_call' ? (
            <McpIcon width={16} height={16} />
          ) : (
            <FunctionsIcon width={16} height={16} />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">
              {message.status === 'completed'
                ? `Called ${message.name}`
                : `Calling ${message.name}...`}
            </span>
            <span className="text-xs text-gray-500">
              {itemTexts.length > 0
                ? itemTexts.join('、')
                : 'No extracted items'}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded ? (
        <div className="ml-6 mt-2 space-y-3 rounded-xl bg-[#fafafa] p-4 text-sm">
          {context ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Context
              </div>
              <p className="mt-1 text-gray-700">{context}</p>
            </div>
          ) : null}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Items
            </div>
            {items.length > 0 ? (
              <ul className="mt-1 space-y-2">
                {items.map((item, index) => (
                  <li
                    key={`${item?.text ?? 'item'}-${index}`}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="text-sm font-medium text-gray-800">
                      {item?.text}
                    </div>
                    {item?.type ? (
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        {item.type}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <ClockIcon width={16} height={16} /> Waiting for items...
              </div>
            )}
          </div>
        </div>
      ) : null}

      {message.status !== 'completed' && !isExpanded ? (
        <div className="ml-6 mt-2 flex items-center gap-2 text-xs text-gray-500">
          <ClockIcon width={16} height={16} /> Waiting for result...
        </div>
      ) : null}
    </div>
  );
}
