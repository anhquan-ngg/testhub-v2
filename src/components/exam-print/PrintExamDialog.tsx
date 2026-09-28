"use client";

import axios from "axios";
import { FileArchive, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ENDPOINTS } from "@/constants/endpoints";
import apiClient from "@/lib/api-client";

const VARIANT_COUNTS = [2, 4, 8] as const;
type VariantCount = (typeof VARIANT_COUNTS)[number];

/** Rendering several PDFs server-side is slow; the default 10s is too short. */
const PRINT_TIMEOUT_MS = 180_000;

type PrintableExam = {
  id: string;
  title: string;
};

/** Removes diacritics so the downloaded file name is safe everywhere. */
const toFileSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "exam";

/** With responseType "blob", error bodies arrive as a Blob holding JSON. */
async function readErrorMessage(error: unknown): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return "Không thể tạo đề thi. Vui lòng thử lại.";
  }
  if (error.code === "ECONNABORTED") {
    return "Tạo đề thi quá thời gian chờ. Vui lòng thử lại.";
  }

  const status = error.response?.status;
  let message = "";
  const data: unknown = error.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await data.text());
      if (parsed && typeof parsed === "object" && "message" in parsed) {
        const raw = (parsed as { message: unknown }).message;
        message = Array.isArray(raw) ? raw.join(", ") : String(raw);
      }
    } catch {
      // Non-JSON body: fall through to the status-based message.
    }
  }

  if (status === 400 && message.startsWith("Not enough questions")) {
    return "Ngân hàng câu hỏi không đủ để tạo đề theo cấu hình phân bố của bài thi.";
  }
  if (status === 400 && message.startsWith("No questions available")) {
    return "Bài thi chưa có câu hỏi nào để in.";
  }
  if (status === 403) return "Bạn không có quyền in đề của bài thi này.";
  if (status === 404) return "Không tìm thấy bài thi.";
  return "Không thể tạo đề thi. Vui lòng thử lại.";
}

/**
 * "In đề" action for the lecturer exam list: lets the lecturer pick how many
 * variants (mã đề) to generate, then downloads a ZIP containing one PDF per
 * variant plus the answer key.
 */
export function PrintExamDialog({ exam }: { exam: PrintableExam }) {
  const [open, setOpen] = useState(false);
  const [variantCount, setVariantCount] = useState<VariantCount>(4);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.post<Blob>(
        ENDPOINTS.EXAMS.PRINT(exam.id),
        { variant_count: variantCount },
        { responseType: "blob", timeout: PRINT_TIMEOUT_MS },
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/zip" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `De_thi_${toFileSlug(exam.title)}_${variantCount}_ma_de.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Đã tạo ${variantCount} mã đề và file đáp án.`);
      setOpen(false);
    } catch (error) {
      console.error("Print exam error:", error);
      toast.error(await readErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isGenerating) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-700 hover:text-gray-900 hover:cursor-pointer"
          title="In đề thi"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-300 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>In đề thi</DialogTitle>
          <DialogDescription>
            Tạo bộ đề in cho kỳ thi offline: {exam.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Số lượng mã đề</Label>
            <RadioGroup
              value={String(variantCount)}
              onValueChange={(value) =>
                setVariantCount(Number(value) as VariantCount)
              }
              className="grid grid-cols-3 gap-3"
              disabled={isGenerating}
            >
              {VARIANT_COUNTS.map((count) => (
                <Label
                  key={count}
                  htmlFor={`variant-count-${count}`}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 hover:cursor-pointer transition-colors ${
                    variantCount === count
                      ? "border-[#0066cc] bg-blue-50 text-[#0066cc]"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <RadioGroupItem
                    id={`variant-count-${count}`}
                    value={String(count)}
                    className="sr-only"
                  />
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-xs">mã đề</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600">
            <FileArchive className="h-5 w-5 flex-none text-gray-400 mt-0.5" />
            <div className="space-y-1">
              <p>
                File <strong>.zip</strong> gồm {variantCount} file PDF đề thi và
                1 file PDF đáp án cho tất cả mã đề.
              </p>
              <p>
                Thứ tự câu hỏi và phương án được trộn riêng cho từng mã đề. Với
                bài thi sinh đề ngẫu nhiên, mỗi mã đề được bốc bộ câu hỏi riêng
                theo cấu hình của bài thi. Mỗi lần in sẽ tạo bộ đề mới.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isGenerating}
            className="hover:cursor-pointer"
          >
            Huỷ
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo đề...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Tạo và tải xuống
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
