"use client";

import ReactMarkdown from "react-markdown";

interface AiSummaryRendererProps {
  content: string;
}

export function AiSummaryRenderer({ content }: AiSummaryRendererProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h3 className="text-sm font-semibold text-[color:var(--app-text)] mt-3 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-xs font-semibold text-[color:var(--app-text-muted)] mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-[color:var(--app-text)] leading-6 my-1">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-2 ml-4">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-sm text-[color:var(--app-text)] leading-6 list-disc">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[color:var(--app-text)]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[color:var(--app-text-muted)]">
              {children}
            </em>
          ),
          code: ({ children }) => (
            <code className="bg-[color:var(--app-surface)] px-2 py-0.5 rounded text-xs font-mono text-[color:var(--app-brand-text)]">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[color:var(--app-brand)] pl-3 italic text-[color:var(--app-text-muted)] my-2">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-2 border-[color:var(--app-border)]" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
