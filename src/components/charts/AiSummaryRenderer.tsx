"use client";

import ReactMarkdown from "react-markdown";

interface AiSummaryRendererProps {
  content: string;
}

export function AiSummaryRenderer({ content }: AiSummaryRendererProps) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h3 className="mt-5 border-t border-[color:var(--app-divider)] pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--app-text-subtle)] first:mt-0 first:border-t-0 first:pt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-3 text-sm font-semibold text-[color:var(--app-text)]">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--app-text)]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-2 pl-1">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-2 text-sm leading-7 text-[color:var(--app-text)]">
              <span className="mt-[0.8em] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--app-brand)]" />
              <span>{children}</span>
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
            <code className="rounded bg-[color:var(--app-surface-soft)] px-1.5 py-0.5 text-xs font-mono text-[color:var(--app-brand-text)]">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-r-2xl border-l-2 border-[color:var(--app-brand)] bg-[color:var(--app-brand-soft)]/60 py-2 pl-3 italic text-[color:var(--app-text-muted)]">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-4 border-[color:var(--app-divider)]" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
