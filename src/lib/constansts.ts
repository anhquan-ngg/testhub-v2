export const UserRoleMap = {
  ADMIN: "Quản trị viên",
  LECTURER: "Giảng viên",
  STUDENT: "Sinh viên",
} as const;

export const QuestionTypeMap = {
  SINGLE_CHOICE: "Trắc nghiệm một đáp án",
  MULTIPLE_CHOICE: "Trắc nghiệm nhiều đáp án",
  ESSAY: "Tự luận",
} as const;

export const QuestionFormatMap = {
  KNOWLEDGE: "Nhận biết",
  UNDERSTANDING: "Thông hiểu",
  APPLYING: "Vận dụng",
  ADVANCED: "Nâng cao",
} as const;
