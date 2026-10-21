import { Suspense } from "react";
import { QuestionGenerationScreen } from "@/components/question-generation/QuestionGenerationScreen";

/** Lecturer AI workspace; the enclosing route already has lecturer authorization. */
export default function GenerateQuestionsPage() {
  return <Suspense><QuestionGenerationScreen /></Suspense>;
}
