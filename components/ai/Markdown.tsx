"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders AI narrative Markdown (bold, bullet/numbered lists, tables, line breaks) as real HTML.
 * Element overrides keep spacing tight for the chat bubble; no typography plugin needed.
 * react-markdown does not use dangerouslySetInnerHTML, so this is safe against injection.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-1.5">{children}</p>,
          ul: ({ children }) => <ul className="my-1.5 list-disc pl-5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal pl-5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-gray-400">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          h1: ({ children }) => <h1 className="text-base font-semibold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-semibold my-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold my-1.5">{children}</h3>,
          code: ({ children }) => (
            <code className="rounded bg-gray-200 px-1 py-0.5 text-xs font-mono">{children}</code>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="border-collapse border border-gray-300 text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left">{children}</th>
          ),
          td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
          a: ({ children, href }) => (
            <a href={href} className="text-blue-600 underline" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
