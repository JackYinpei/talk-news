import clsx from 'clsx';
import React from 'react';

const CustomLink = ({ href, children, ...props }) => (
  <a
    href={href}
    {...props}
    className="rounded-full py-1 px-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80"
  >
    {children}
  </a>
);

export function TextMessage({ text, isUser }) {
  return (
    <div
      className={clsx('flex flex-row gap-2', {
        'justify-end py-2': isUser,
      })}
    >
      <div
        className={clsx('rounded-[16px] whitespace-pre-wrap', {
          // User bubble (right)
          'px-4 py-2 max-w-[90%] ml-4 bg-secondary text-secondary-foreground': isUser,
          // Assistant bubble (left)
          'px-4 py-2 max-w-[90%] mr-4 bg-muted text-foreground border border-border': !isUser,
        })}
      >
        {text}
      </div>
    </div>
  );
}
