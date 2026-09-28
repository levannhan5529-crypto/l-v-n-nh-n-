import React from "react";
import katex from "katex";

interface MathFormulaProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({ math, block = false, className = "" }) => {
  try {
    const html = katex.renderToString(math, {
      displayMode: block,
      throwOnError: false,
    });
    return (
      <span
        className={`inline-math ${block ? "block text-center my-2" : "inline-block px-0.5"} ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    return <span className={`font-serif italic ${className}`}>{math}</span>;
  }
};

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Parses a string that may contain inline math $...$, block math $$...$$,
 * and standard bold/italic markdown into properly rendered React elements.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = "" }) => {
  if (!text) return null;

  // Split text by block math $$...$$ first, then inline math $...$
  const lines = text.split("\n");

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-2" />;
        }

        // Tokenize line by $$...$$ and $...$
        // regex matches $$...$$ or $...$
        const parts: React.ReactNode[] = [];
        const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          // Push text before match
          if (match.index > lastIndex) {
            const rawText = line.substring(lastIndex, match.index);
            parts.push(<span key={`text-${lastIndex}`}>{renderSimpleMarkdown(rawText)}</span>);
          }

          const matchedStr = match[0];
          if (matchedStr.startsWith("$$") && matchedStr.endsWith("$$")) {
            const formula = matchedStr.slice(2, -2).trim();
            parts.push(<MathFormula key={`math-${match.index}`} math={formula} block={true} />);
          } else if (matchedStr.startsWith("$") && matchedStr.endsWith("$")) {
            const formula = matchedStr.slice(1, -1).trim();
            parts.push(<MathFormula key={`math-${match.index}`} math={formula} block={false} />);
          }

          lastIndex = regex.lastIndex;
        }

        // Remaining text
        if (lastIndex < line.length) {
          const rawText = line.substring(lastIndex);
          parts.push(<span key={`text-${lastIndex}`}>{renderSimpleMarkdown(rawText)}</span>);
        }

        return <div key={lineIdx}>{parts}</div>;
      })}
    </div>
  );
};

// Helper for basic markdown like **bold**, *italic*, and `code`
function renderSimpleMarkdown(raw: string): React.ReactNode {
  // Simple token parser for **bold** and *italic*
  const tokens = raw.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={idx} className="font-bold text-slate-100">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={idx} className="italic text-slate-200">{token.slice(1, -1)}</em>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-cyan-300 font-mono text-xs">
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}
