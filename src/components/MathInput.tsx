"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const MATH_SYMBOLS = [
  { label: "x²", latex: "x^2" },
  { label: "log", latex: "\\log_{a}{b}" },
  { label: "ln", latex: "\\ln" },
  { label: "a/b", latex: "\\frac{a}{b}" },
  { label: "√", latex: "\\sqrt{}" },
  { label: "∑", latex: "\\sum" },
  { label: "∫", latex: "\\int" },
  { label: "α", latex: "\\alpha" },
  { label: "β", latex: "\\beta" },
  { label: "π", latex: "\\pi" },
  { label: "∞", latex: "\\infty" },
  { label: "≤", latex: "\\leq" },
  { label: "≥", latex: "\\geq" },
  { label: "≠", latex: "\\neq" },
  { label: "÷", latex: "\\div" },
  { label: "×", latex: "\\times" },
  { label: "±", latex: "\\pm" },
];

export function MathInput({
  value,
  onChange,
  placeholder = "Nhập văn bản hoặc công thức LaTeX",
  className,
  id,
}: MathInputProps) {
  const [showSymbols, setShowSymbols] = useState(false);

  const insertSymbol = (latex: string) => {
    const input = document.getElementById(
      id || "math-input"
    ) as HTMLInputElement;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = value.substring(0, start) + latex + value.substring(end);
      onChange(newValue);

      // Set cursor position after inserted text
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + latex.length, start + latex.length);
      }, 0);
    } else {
      onChange(value + latex);
    }
  };

  const renderPreview = () => {
    if (!value) return null;

    try {
      // Auto-wrap LaTeX if it contains LaTeX commands but no $ delimiters
      let processedValue = value;
      const hasLatexCommands = /\\[a-zA-Z]+/.test(value);
      const hasMathDelimiters = /\$/.test(value);

      // If has LaTeX commands but no $ delimiters, auto-wrap it
      if (hasLatexCommands && !hasMathDelimiters) {
        processedValue = `$${value}$`;
      }

      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let key = 0;

      // First, extract and process display math ($$...$$)
      const displayMathRegex = /\$\$(.+?)\$\$/g;
      let displayMatch;
      const displayMatches: { index: number; length: number; math: string }[] =
        [];

      while ((displayMatch = displayMathRegex.exec(processedValue)) !== null) {
        displayMatches.push({
          index: displayMatch.index,
          length: displayMatch[0].length,
          math: displayMatch[1],
        });
      }

      // Process inline math, excluding display math regions
      const inlineMathRegex = /\$(.+?)\$/g;
      let inlineMatch;
      const inlineMatches: { index: number; length: number; math: string }[] =
        [];

      while ((inlineMatch = inlineMathRegex.exec(processedValue)) !== null) {
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
          const textBefore = processedValue.substring(lastIndex, match.index);
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
          parts.push(
            <span key={key++} className="text-red-500" title="Lỗi render">
              {processedValue.substring(
                match.index,
                match.index + match.length
              )}
            </span>
          );
        }

        lastIndex = match.index + match.length;
      });

      // Add remaining text
      if (lastIndex < processedValue.length) {
        parts.push(
          <span key={key++}>{processedValue.substring(lastIndex)}</span>
        );
      }

      return parts.length > 0 ? parts : processedValue;
    } catch (error) {
      return <div className="text-red-500">Lỗi render: {String(error)}</div>;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-start">
        <Input
          id={id || "math-input"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSymbols(!showSymbols)}
          className="text-white border-none bg-[#0066cc] hover:bg-[#0052a3] whitespace-nowrap h-10 px-3"
        >
          ∑ Ký hiệu
        </Button>
      </div>

      {showSymbols && (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded border border-gray-200">
          {MATH_SYMBOLS.map((symbol) => (
            <Button
              key={symbol.latex}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertSymbol(symbol.latex)}
              className="h-8 px-2 text-sm"
              title={symbol.latex}
            >
              {symbol.label}
            </Button>
          ))}
        </div>
      )}

      {value && (
        <div className="p-4 bg-white rounded border border-gray-300 shadow-sm">
          <div className="text-xs font-medium text-gray-700 mb-2">Preview:</div>
          <div className="text-base leading-relaxed">{renderPreview()}</div>
        </div>
      )}
    </div>
  );
}
