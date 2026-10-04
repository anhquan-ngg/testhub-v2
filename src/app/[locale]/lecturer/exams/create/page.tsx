"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type Topic = {
  id: string;
  name: string;
};

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function CreateExamPage() {
  const t = useTranslations("lecturer.createExam");
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examForm, setExamForm] = useState({
    title: "",
    topic_id: "",
    exam_start_time: "",
    exam_end_time: "",
    duration: "",
    practice: false,
    is_public: false,
  });

  useEffect(() => {
    const fetchTopics = async () => {
      setIsLoadingTopics(true);
      try {
        const response = await apiClient.get<PageResult<Topic>>(
          ENDPOINTS.TOPICS.BASE,
          {
            params: { limit: 100 },
          },
        );
        setTopics(response.data.data ?? []);
      } catch (error) {
        console.error("Fetch topics error:", error);
        toast.error(t("unableToLoadTopicList"));
      } finally {
        setIsLoadingTopics(false);
      }
    };

    void fetchTopics();
  }, [t]);

  const handleAddExam = async () => {
    if (isSubmitting) return;

    if (
      !examForm.title ||
      !examForm.topic_id ||
      !examForm.exam_start_time ||
      !examForm.exam_end_time ||
      !examForm.duration
    ) {
      toast.warning(t("pleaseFillInAllInformation"));
      return;
    }

    const payload = {
      title: examForm.title.trim(),
      topic_id: examForm.topic_id,
      exam_start_time: new Date(examForm.exam_start_time).toISOString(),
      exam_end_time: new Date(examForm.exam_end_time).toISOString(),
      duration: Number.parseInt(examForm.duration),
      practice: examForm.practice,
      is_public: examForm.is_public,
    };

    setIsSubmitting(true);
    try {
      await apiClient.post(ENDPOINTS.EXAMS.BASE, payload);
      toast.success(t("createASuccessfulTest"));
      setExamForm({
        title: "",
        topic_id: "",
        exam_start_time: "",
        exam_end_time: "",
        duration: "",
        practice: false,
        is_public: false,
      });
      router.push("/lecturer/exams");
    } catch (error) {
      console.error("Create exam error:", error);
      toast.error(t("createFailedTestPleaseTryAgain"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900">{t("createANewTest")}</h2>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle>{t("examInformation")}</CardTitle>
          <CardDescription>
            {t("fillInTheDetailsToCreate")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam-title">
                  {t("testName")}<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="exam-title"
                  placeholder={t("enterTheTestName")}
                  value={examForm.title}
                  onChange={(e) =>
                    setExamForm({ ...examForm, title: e.target.value })
                  }
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-topic">
                  {t("topic")}<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={examForm.topic_id}
                  onValueChange={(value) =>
                    setExamForm({ ...examForm, topic_id: value })
                  }
                  disabled={isLoadingTopics}
                >
                  <SelectTrigger
                    id="exam-topic"
                    className="bg-white border-gray-300"
                  >
                    <SelectValue
                      placeholder={
                        isLoadingTopics ? t("loadingTheme") : t("chooseATopic")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">
                  {t("startTime")}<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={examForm.exam_start_time}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      exam_start_time: e.target.value,
                    })
                  }
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">
                  {t("endTime")}<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={examForm.exam_end_time}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      exam_end_time: e.target.value,
                    })
                  }
                  className="bg-white border-gray-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  {t("durationMinutes")}<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="90"
                  value={examForm.duration}
                  onChange={(e) =>
                    setExamForm({ ...examForm, duration: e.target.value })
                  }
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="practice">{t("examType")}</Label>
                <Select
                  value={examForm.practice ? "practice" : "test"}
                  onValueChange={(value) =>
                    setExamForm({
                      ...examForm,
                      practice: value === "practice",
                    })
                  }
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="test">{t("officialTest")}</SelectItem>
                    <SelectItem value="practice">{t("practiceExam")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 py-4">
                <Checkbox
                  id="is_public"
                  checked={examForm.is_public}
                  onCheckedChange={(checked) =>
                    setExamForm({
                      ...examForm,
                      is_public: checked as boolean,
                    })
                  }
                  className="bg-white border-gray-300"
                />
                <Label
                  htmlFor="is_public"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t("makeTheExamPublicStudentsCan")}</Label>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={() => router.push("/lecturer/exams")}
                disabled={isSubmitting}
                className="flex-1 border-gray-300 hover:bg-gray-100 hover:border-none hover:cursor-pointer"
              >
                {t("cancel")}</Button>
              <Button
                onClick={handleAddExam}
                disabled={isSubmitting}
                className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white hover:cursor-pointer"
              >
                {isSubmitting ? t("creating") : t("createTest")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
