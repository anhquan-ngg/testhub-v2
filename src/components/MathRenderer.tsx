"use client";

import React from "react";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  if (!content) return null;

  try {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    // Create a copy to work with
    let remainingText = content;

    // First, extract and process display math ($$...$$)
    const displayMathRegex = /\$\$(.+?)\$\$/g;
    let displayMatch;
    const displayMatches: { index: number; length: number; math: string }[] =
      [];

    while ((displayMatch = displayMathRegex.exec(content)) !== null) {
      displayMatches.push({
        index: displayMatch.index,
        length: displayMatch[0].length,
        math: displayMatch[1],
      });
    }

    // Process inline math, excluding display math regions
    const inlineMathRegex = /\$(.+?)\$/g;
    let inlineMatch;
    const inlineMatches: { index: number; length: number; math: string }[] = [];

    while ((inlineMatch = inlineMathRegex.exec(content)) !== null) {
      // Check if this inline match is inside a display match
      const isInsideDisplay = displayMatches.some(
        (dm) =>
          inlineMatch!.index >= dm.index &&
          inlineMatch!.index < dm.index + dm.length
      );

      if (!isInsideDisplay) {
        inlineMatches.push({
          index: inlineMatch.index,
          length: inlineMatch[0].length,
          math: inlineMatch[1],
        });
      }
    }

    // Combine and sort all matches
    const allMatches = [
      ...displayMatches.map((m) => ({ ...m, type: "display" as const })),
      ...inlineMatches.map((m) => ({ ...m, type: "inline" as const })),
    ].sort((a, b) => a.index - b.index);

    // Render parts
    allMatches.forEach((match) => {
      // Add text before this match
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(<span key={key++}>{textBefore}</span>);
      }

      // Add the math component
      try {
        if (match.type === "display") {
          parts.push(<BlockMath key={key++} math={match.math} />);
        } else {
          parts.push(<InlineMath key={key++} math={match.math} />);
        }
      } catch (e) {
        // If rendering fails, show the original text
        const originalText = content.substring(
          match.index,
          match.index + match.length
        );
        parts.push(
          <span
            key={key++}
            className="text-red-500"
            title="Math rendering error"
          >
            {originalText}
          </span>
        );
      }

      lastIndex = match.index + match.length;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.substring(lastIndex)}</span>);
    }

    return (
      <div className={`${className} leading-relaxed`}>
        {parts.length > 0 ? parts : content}
      </div>
    );
  } catch (error) {
    // Fallback to plain text if there's an error
    return <div className={className}>{content}</div>;
  }
}
