"use client";

import { useEnumLabels } from "@/i18n/useEnumLabels";
import { questionFormatConfig, questionTypeConfig } from "../constants";
import type { QuestionFormat, QuestionType } from "../types";

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const labels = useEnumLabels();
  const config = questionTypeConfig[type];
  const Icon = config.Icon;

  return (
    <div
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full ${config.bgColor} px-3 py-1.5`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
      <span className={`text-xs font-semibold ${config.color}`}>
        {labels.questionType(type)}
      </span>
    </div>
  );
}

export function QuestionFormatBadge({ format }: { format: QuestionFormat }) {
  const labels = useEnumLabels();
  const config = questionFormatConfig[format];

  return (
    <div
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full ${config.bgColor} px-3 py-1.5`}
    >
      <div className="flex gap-0.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full bg-current ${config.color} ${
              index < config.level ? "" : "opacity-30"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold ${config.color}`}>
        {labels.questionFormat(format)}
      </span>
    </div>
  );
}
