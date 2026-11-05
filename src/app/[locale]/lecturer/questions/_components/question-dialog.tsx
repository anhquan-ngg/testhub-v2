"use client";

import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MathInput } from "@/components/MathInput";
import { emptyOptions, optionLabels } from "../constants";
import type { QuestionFile, QuestionForm, QuestionFormat, QuestionType } from "../types";
import { getFileType } from "../utils";
import { QuestionFilesList, SelectedFilesList } from "./question-files";

export function QuestionDialog({
  open,
  onOpenChange,
  mode,
  questionForm,
  setQuestionForm,
  selectedFiles,
  setSelectedFiles,
  existingFiles,
  replaceFiles,
  setReplaceFiles,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  questionForm: QuestionForm;
  setQuestionForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  existingFiles: QuestionFile[];
  replaceFiles: boolean;
  setReplaceFiles: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}) {
  const t = useTranslations("lecturer.questions");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-4xl overflow-y-auto bg-white border-gray-300">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? t("updateQuestion") : t("createQuestions")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>{t("questionContent")}</Label>
            <MathInput
              value={questionForm.question_text}
              onChange={(value) =>
                setQuestionForm((prev) => ({ ...prev, question_text: value }))
              }
              placeholder={t("enterQuestionContent")}
              className="bg-white border-gray-300"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("questionTypeLabel")}</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    question_type: value as QuestionType,
                    options: value === "ESSAY" ? emptyOptions() : value === "SINGLE_CHOICE"
                      ? prev.options.map((option, index) => ({ ...option, isCorrect: option.isCorrect && index === prev.options.findIndex((item) => item.isCorrect) }))
                      : prev.options,
                  }))
                }
              >
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="SINGLE_CHOICE">{t("oneAnswer")}</SelectItem>
                  <SelectItem value="MULTIPLE_CHOICE">{t("manyAnswers")}</SelectItem>
                  <SelectItem value="ESSAY">{t("essay")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("questionFormatLabel")}</Label>
              <Select
                value={questionForm.question_format}
                onValueChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    question_format: value as QuestionFormat,
                  }))
                }
              >
                <SelectTrigger className="bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="KNOWLEDGE">{t("recognize")}</SelectItem>
                  <SelectItem value="UNDERSTANDING">{t("understanding")}</SelectItem>
                  <SelectItem value="APPLYING">{t("manipulate")}</SelectItem>
                  <SelectItem value="ADVANCED">{t("advanced")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {questionForm.question_type === "ESSAY" ? (
            <div className="space-y-2">
              <Label>{t("answer")}</Label>
              <MathInput
                value={questionForm.correct_answer}
                onChange={(value) =>
                  setQuestionForm((prev) => ({
                    ...prev,
                    correct_answer: value,
                  }))
                }
                placeholder={t("enterTheReferenceAnswer")}
                className="bg-white border-gray-300"
              />
            </div>
          ) : (
            <QuestionOptionsEditor
              questionForm={questionForm}
              setQuestionForm={setQuestionForm}
            />
          )}

          {mode === "edit" ? (
            <div className="min-w-0 space-y-4">
              <div className="min-w-0 space-y-2">
                <Label>{t("currentAttachment")}</Label>
                <QuestionFilesList
                  files={replaceFiles ? undefined : existingFiles}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("replacementFile")}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600 hover:border-[#0066cc]">
                    <Upload className="mb-2 h-5 w-5" />
                    {t("selectAudioVideoOrImage")}<Input
                      type="file"
                      multiple
                      accept="image/*,audio/*,video/*"
                      className="hidden"
                      onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        if (!files.length) return;
                        const validFiles = files.filter((file) =>
                          getFileType(file),
                        );
                        if (validFiles.length !== files.length) {
                          toast.error(t("onlySupportsAudioVideoOrImages"));
                        }
                        if (validFiles.length) {
                          setSelectedFiles(validFiles);
                          setReplaceFiles(true);
                        }
                      }}
                    />
                  </label>

                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 hover:cursor-pointer"
                      onClick={() => {
                        setSelectedFiles([]);
                        setReplaceFiles(false);
                      }}
                    >
                      {t("keepTheCurrentFile")}</Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:cursor-pointer"
                      onClick={() => {
                        setSelectedFiles([]);
                        setReplaceFiles(true);
                      }}
                    >
                      {t("deleteCurrentFile")}</Button>
                  </div>
                </div>

                {replaceFiles && selectedFiles.length > 0 && (
                  <SelectedFilesList files={selectedFiles} />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("attachedFiles")}</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600 hover:border-[#0066cc]">
                <Upload className="mb-2 h-5 w-5" />
                {t("selectAudioVideoOrImage")}<Input
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    const validFiles = files.filter((file) =>
                      getFileType(file),
                    );
                    if (validFiles.length !== files.length) {
                      toast.error(t("onlySupportsAudioVideoOrImages"));
                    }
                    setSelectedFiles(validFiles);
                  }}
                />
              </label>
              {selectedFiles.length > 0 && (
                <SelectedFilesList files={selectedFiles} />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="hover:cursor-pointer"
          >
            {t("cancel")}</Button>
          <Button
            disabled={isSubmitting}
            onClick={() =>
              onSubmit().catch(() =>
                toast.error(
                  mode === "edit"
                    ? t("unableToUpdateQuestion")
                    : t("cannotCreateQuestion"),
                ),
              )
            }
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}</>
            ) : mode === "edit" ? (
              t("save")
            ) : (
              t("create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionOptionsEditor({
  questionForm,
  setQuestionForm,
}: {
  questionForm: QuestionForm;
  setQuestionForm: React.Dispatch<React.SetStateAction<QuestionForm>>;
}) {
  const t = useTranslations("lecturer.questions");
  if (questionForm.question_type === "SINGLE_CHOICE") {
    return (
      <div className="space-y-3">
        <Label>{t("answer")}</Label>
        <RadioGroup
          value={String(
            questionForm.options.findIndex((option) => option.isCorrect),
          )}
          onValueChange={(value) => {
            const selected = Number(value);
            setQuestionForm((prev) => ({
              ...prev,
              options: prev.options.map((option, index) => ({
                ...option,
                isCorrect: index === selected,
              })),
            }));
          }}
        >
          {questionForm.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 text-sm font-medium">
                {optionLabels[index]}
              </span>
              <MathInput
                value={option.text}
                onChange={(value) => {
                  const next = [...questionForm.options];
                  next[index] = { ...next[index], text: value };
                  setQuestionForm((prev) => ({ ...prev, options: next }));
                }}
                placeholder={t("optionLabel", { label: optionLabels[index] })}
                className="bg-white border-gray-300"
              />
              <RadioGroupItem value={String(index)} />
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>{t("answer")}</Label>
      {questionForm.options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 text-sm font-medium">{optionLabels[index]}</span>
          <MathInput
            value={option.text}
            onChange={(value) => {
              const next = [...questionForm.options];
              next[index] = { ...next[index], text: value };
              setQuestionForm((prev) => ({ ...prev, options: next }));
            }}
            placeholder={t("optionLabel", { label: optionLabels[index] })}
            className="bg-white border-gray-300"
          />
          <Checkbox
            checked={option.isCorrect}
            onCheckedChange={(checked) => {
              const next = [...questionForm.options];
              next[index] = { ...next[index], isCorrect: Boolean(checked) };
              setQuestionForm((prev) => ({ ...prev, options: next }));
            }}
          />
        </div>
      ))}
    </div>
  );
}
