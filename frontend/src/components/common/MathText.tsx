import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text?: string | null;
  className?: string;
  block?: boolean;
  inline?: boolean;
  as?: 'span' | 'div' | 'p';
}

interface MathSegment {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

/**
 * Normalizes common LaTeX escaped commands, double backslashes, and delimiters.
 */
function normalizeLatex(input: string): string {
  if (!input) return '';
  let text = input;

  // Replace double backslashes before common LaTeX keywords, symbols or delimiters
  text = text.replace(/\\\\([a-zA-Z]+|[\(\)\[\]\{\}\_\^\,\;\:\$])/g, (_match, cmd) => `\\${cmd}`);

  return text;
}

/**
 * Common LaTeX command keywords for detecting raw/unwrapped math expressions.
 */
const LATEX_COMMAND_REGEX = /\\(frac|sqrt|mathbb|to|rightarrow|leftarrow|Rightarrow|Leftarrow|rightleftharpoons|times|div|cdot|pm|mp|sum|int|lim|Delta|alpha|beta|gamma|theta|pi|lambda|omega|infty|partial|leq|geq|neq|approx|quad|qquad|text|vec|mathbf|circ|log|ln|left|right|degree|prod|subset|in|notin|forall|exists|sigma|mu|nu|rho|tau|phi|psi|epsilon|cap|cup|equiv)\b/;

/**
 * Parses mixed text containing mathematical expressions into segments:
 * - Block math: $$...$$ or \[...\]
 * - Inline math: $...$ or \(...\)
 * - Raw math: un-delimited LaTeX (e.g., \mathbb{R}, \frac{x-5}{3}, M = \frac{n_B}{V_{(L)}})
 * - Option prefixes: e.g., "A) ", "(b) ", "1. "
 * - Text: regular conversational text
 */
function parseMathSegments(text: string, forceBlock = false): MathSegment[] {
  if (!text) return [];

  const normalized = normalizeLatex(text.trim());

  // 1. If wrapped entirely in block math delimiters: $$...$$ or \[...\]
  if (
    (normalized.startsWith('$$') && normalized.endsWith('$$') && normalized.length > 4) ||
    (normalized.startsWith('\\[') && normalized.endsWith('\\]') && normalized.length > 4)
  ) {
    const clean = normalized.slice(2, -2).trim();
    return [{ type: 'block-math', content: clean }];
  }

  // 2. If wrapped entirely in inline math delimiters: $...$ or \(...\)
  if (
    (normalized.startsWith('$') && normalized.endsWith('$') && normalized.length > 2) ||
    (normalized.startsWith('\\(') && normalized.endsWith('\\)') && normalized.length > 4)
  ) {
    const clean = normalized.startsWith('$') ? normalized.slice(1, -1).trim() : normalized.slice(2, -2).trim();
    return [{ type: forceBlock ? 'block-math' : 'inline-math', content: clean }];
  }

  // 3. Option prefix handling: e.g. "A) $\frac{x-5}{3}$" or "A) \frac{x-5}{3}" or "(a) \mathbb{R}"
  const optionPrefixMatch = normalized.match(/^([A-Da-d1-4][\)\.]|\([A-Da-d1-4]\))\s+/);
  let prefix = '';
  let rest = normalized;

  if (optionPrefixMatch) {
    prefix = optionPrefixMatch[0];
    rest = normalized.slice(prefix.length).trim();
  }

  // If the remainder of the option is pure math (wrapped or raw LaTeX)
  if (
    (rest.startsWith('$') && rest.endsWith('$') && rest.length > 2) ||
    LATEX_COMMAND_REGEX.test(rest) ||
    (rest.includes('=') && (rest.includes('_') || rest.includes('^') || rest.includes('/') || rest.includes('\\')))
  ) {
    let mathContent = rest;
    if (mathContent.startsWith('$') && mathContent.endsWith('$')) {
      mathContent = mathContent.slice(1, -1).trim();
    } else if (mathContent.startsWith('\\(') && mathContent.endsWith('\\)')) {
      mathContent = mathContent.slice(2, -2).trim();
    }

    const segments: MathSegment[] = [];
    if (prefix) {
      segments.push({ type: 'text', content: prefix });
    }
    segments.push({ type: forceBlock ? 'block-math' : 'inline-math', content: mathContent });
    return segments;
  }

  // 4. Standalone raw LaTeX without option prefix (e.g., "\mathbb{R}", "\to", "M = \frac{n_B}{V_{(L)}}")
  if (
    LATEX_COMMAND_REGEX.test(normalized) &&
    !normalized.includes('$') &&
    !/^(what|why|how|explain|describe|which|when|where|consider)\b/i.test(normalized)
  ) {
    return [{ type: forceBlock ? 'block-math' : 'inline-math', content: normalized }];
  }

  // 5. Mixed text and embedded math: extract delimiters ($$...$$, $...$, \(...\), \[...\])
  const segments: MathSegment[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\\$|[^\$])+?\$|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = normalized.substring(lastIndex, match.index);
      if (textChunk) {
        segments.push({ type: 'text', content: textChunk });
      }
    }

    const rawMatch = match[0];
    if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
      segments.push({ type: 'block-math', content: rawMatch.slice(2, -2).trim() });
    } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
      segments.push({ type: 'block-math', content: rawMatch.slice(2, -2).trim() });
    } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$')) {
      segments.push({ type: 'inline-math', content: rawMatch.slice(1, -1).trim() });
    } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
      segments.push({ type: 'inline-math', content: rawMatch.slice(2, -2).trim() });
    }

    lastIndex = match.index + rawMatch.length;
  }

  if (lastIndex < normalized.length) {
    const trailing = normalized.substring(lastIndex);
    if (trailing) {
      // Check if trailing has raw LaTeX commands that were not enclosed in dollars
      if (LATEX_COMMAND_REGEX.test(trailing) && !trailing.includes('$')) {
        segments.push({ type: 'inline-math', content: trailing.trim() });
      } else {
        segments.push({ type: 'text', content: trailing });
      }
    }
  }

  return segments;
}

/**
 * Render LaTeX with KaTeX safely using currentColor to prevent unintended red styling.
 */
function renderKaTeX(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: 'currentColor',
      output: 'htmlAndMathml',
      strict: false,
      trust: false,
    });
  } catch {
    return `<span class="katex-fallback font-mono">${latex}</span>`;
  }
}

export const MathText: React.FC<MathTextProps> = ({
  text,
  className = '',
  block = false,
  inline = false,
  as: Component = block ? 'div' : 'span',
}) => {
  const segments = useMemo(() => {
    if (!text) return [];
    return parseMathSegments(text, block);
  }, [text, block]);

  if (!text) return null;

  // Single pure math segment shortcut
  if (segments.length === 1 && segments[0].type !== 'text') {
    const seg = segments[0];
    const isDisplay = !inline && (block || seg.type === 'block-math');
    const html = renderKaTeX(seg.content, isDisplay);

    if (isDisplay) {
      return (
        <div
          className={`katex-block-wrapper my-2 overflow-x-auto max-w-full text-center py-1 scrollbar-thin ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <span
        className={`katex-inline-wrapper inline-block align-baseline max-w-full overflow-x-auto ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <Component className={`math-text-container ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
        }

        const isDisplay = !inline && (block || seg.type === 'block-math');
        const html = renderKaTeX(seg.content, isDisplay);

        if (isDisplay) {
          return (
            <span
              key={idx}
              className="katex-block-wrapper block my-2 overflow-x-auto max-w-full text-center py-1 scrollbar-thin"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        return (
          <span
            key={idx}
            className="katex-inline-wrapper inline-block align-baseline max-w-full overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </Component>
  );
};
