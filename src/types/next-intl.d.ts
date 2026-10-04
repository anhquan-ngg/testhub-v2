import type { Locale } from "@/i18n/config";
import vi from "@/messages/vi";

// Kiểu hóa key của message: `t("sai.key")` sẽ báo lỗi lúc typecheck.
// Bộ message tiếng Việt là nguồn chuẩn; bản tiếng Anh phải có cùng cấu trúc.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof vi;
  }
}
