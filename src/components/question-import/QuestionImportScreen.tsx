"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ENDPOINTS } from "@/constants/endpoints";
import { fetchAllPages } from "@/lib/pagination";
import { QuestionImportWorkspace } from "./QuestionImportWorkspace";

type Topic = { id: string; name: string };
type Props = { defaultTopicId?: string; defaultChapterId?: string };

/** Loads lecturer topics before mounting the page-based import workflow. */
export function QuestionImportScreen({ defaultTopicId, defaultChapterId }: Props) {
  const t = useTranslations("shared.questionImport");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchAllPages<Topic>(ENDPOINTS.TOPICS.BASE, {})
      .then((data) => { if (!cancelled) setTopics(data); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const initialTopic = topics.some((topic) => topic.id === defaultTopicId)
    ? defaultTopicId : undefined;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-neutral-900">{t("importQuestionBank")}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t("useAFixedTemplateCheckFor")}</p>
      </header>
      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-12 text-sm text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />{t("loadingTopics")}
        </div>
      ) : failed || !topics.length ? (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
          <p role={failed ? "alert" : "status"} className="flex items-center gap-2 text-sm text-neutral-600">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            {failed ? t("unableToLoadTopics") : t("createTopicFirst")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href="/lecturer/questions"><ArrowLeft />{t("backToBank")}</Link></Button>
            {failed && <Button onClick={() => setAttempt((value) => value + 1)}>{t("retryLoading")}</Button>}
          </div>
        </div>
      ) : (
        <QuestionImportWorkspace
          topics={topics}
          defaultTopicId={initialTopic}
          defaultChapterId={initialTopic ? defaultChapterId : undefined}
        />
      )}
    </div>
  );
}
