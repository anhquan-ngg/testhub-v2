import { useTranslations } from "next-intl";

// Dịch giá trị enum của backend (userRole, questionType, questionFormat)
// sang nhãn theo locale hiện tại. Giá trị lạ thì trả lại nguyên văn.
export function useEnumLabels() {
  const t = useTranslations("enums");

  const label =
    (group: "userRole" | "questionType" | "questionFormat") =>
    (value?: string | null) => {
      if (!value) return "";
      const key = `${group}.${value}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (t as any).has(key) ? (t as any)(key) : value;
    };

  return {
    userRole: label("userRole"),
    questionType: label("questionType"),
    questionFormat: label("questionFormat"),
  };
}
