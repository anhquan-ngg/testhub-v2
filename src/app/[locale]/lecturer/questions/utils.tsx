import { FileAudio, FileImage, FileVideo } from "lucide-react";
import { QUESTION_PREVIEW_MAX_LENGTH, emptyOptions, optionLabels } from "./constants";
import type { FileType, ParsedQuestionOption, Question, QuestionForm } from "./types";

export const getFileType = (file: File): FileType | null => {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("audio/")) return "AUDIO";
  if (file.type.startsWith("video/")) return "VIDEO";
  return null;
};

export const fileIcon = (type: FileType) => {
  if (type === "IMAGE") return <FileImage className="h-4 w-4" />;
  if (type === "AUDIO") return <FileAudio className="h-4 w-4" />;
  return <FileVideo className="h-4 w-4" />;
};

export const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatFileSize = (size?: number) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getQuestionPreviewText = (questionText: string) => {
  const normalizedText = questionText.replace(/\s+/g, " ").trim();
  if (normalizedText.length <= QUESTION_PREVIEW_MAX_LENGTH) {
    return normalizedText;
  }

  let previewText = normalizedText
    .slice(0, QUESTION_PREVIEW_MAX_LENGTH)
    .trimEnd();

  const hasUnclosedLatex = (value: string) => {
    const singleDollarCount = (value.match(/(^|[^\\])\$/g) || []).length;
    const inlineOpenCount = (value.match(/\\\(/g) || []).length;
    const inlineCloseCount = (value.match(/\\\)/g) || []).length;
    const displayOpenCount = (value.match(/\\\[/g) || []).length;
    const displayCloseCount = (value.match(/\\\]/g) || []).length;
    const beginCount = (value.match(/\\begin\{/g) || []).length;
    const endCount = (value.match(/\\end\{/g) || []).length;

    return (
      singleDollarCount % 2 === 1 ||
      inlineOpenCount > inlineCloseCount ||
      displayOpenCount > displayCloseCount ||
      beginCount > endCount
    );
  };

  while (previewText && hasUnclosedLatex(previewText)) {
    const cutCandidates = [
      previewText.lastIndexOf("$$"),
      previewText.lastIndexOf("\\("),
      previewText.lastIndexOf("\\["),
      previewText.lastIndexOf("\\begin{"),
      previewText.lastIndexOf("$"),
      previewText.lastIndexOf(" "),
    ].filter((index) => index >= 0);

    const cutIndex =
      cutCandidates.length > 0
        ? Math.min(...cutCandidates)
        : previewText.length - 1;
    previewText = previewText.slice(0, Math.max(0, cutIndex)).trimEnd();
  }

  return `${previewText}...`;
};

export const parseQuestionOptions = (question: Question) => {
  if (!question.options) return [];
  try {
    return JSON.parse(question.options) as ParsedQuestionOption[];
  } catch {
    return [];
  }
};

export const getLegacyCorrectLabels = (question: Question) => {
  const legacyAnswer = question.correct_answer?.trim();
  if (!legacyAnswer) return new Set<string>();

  try {
    const labels = JSON.parse(legacyAnswer);
    if (Array.isArray(labels)) {
      return new Set(labels.map((label) => String(label)));
    }
  } catch {
    // Old single-choice questions stored the correct answer as a plain label.
  }

  return new Set([legacyAnswer]);
};

export const getQuestionFormFromQuestion = (question: Question): QuestionForm => {
  const parsedOptions = parseQuestionOptions(question);
  const hasCorrectFlag = parsedOptions.some(
    (option) => typeof option.isCorrect === "boolean",
  );
  const legacyCorrectLabels = getLegacyCorrectLabels(question);
  const normalizedOptions =
    question.question_type === "ESSAY"
      ? emptyOptions()
      : parsedOptions.map((option, index) => ({
          text: option.text ?? "",
          isCorrect: hasCorrectFlag
            ? Boolean(option.isCorrect)
            : legacyCorrectLabels.has(option.label ?? optionLabels[index]),
        }));

  while (normalizedOptions.length < 4) {
    normalizedOptions.push({ text: "", isCorrect: false });
  }

  return {
    chapter_id: question.chapter_id,
    question_text: question.question_text,
    question_type: question.question_type,
    question_format: question.question_format,
    options: normalizedOptions.slice(0, optionLabels.length),
    correct_answer:
      question.question_type === "ESSAY"
        ? (question.correct_answer ?? "")
        : "",
  };
};

export const getQuestionAnswerText = (question: Question) => {
  if (question.question_type === "ESSAY") {
    return question.correct_answer?.trim() || "-";
  }

  const options = parseQuestionOptions(question);
  const correctOptions = options
    .map((option, index) =>
      option.isCorrect
        ? `${option.label ?? optionLabels[index]}. ${option.text}`
        : null,
    )
    .filter(Boolean);

  if (correctOptions.length) return correctOptions.join(", ");

  const legacyAnswer = question.correct_answer?.trim();
  if (!legacyAnswer) return "-";

  try {
    const labels = JSON.parse(legacyAnswer);
    if (Array.isArray(labels)) {
      return labels
        .map((label) => {
          const optionIndex = optionLabels.indexOf(String(label));
          const option = options[optionIndex];
          return option ? `${label}. ${option.text}` : String(label);
        })
        .join(", ");
    }
  } catch {
    // Old single-choice questions stored the correct answer as a plain label.
  }

  const optionIndex = optionLabels.indexOf(legacyAnswer);
  const option = options[optionIndex];
  return option ? `${legacyAnswer}. ${option.text}` : legacyAnswer;
};
