export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
  },
  TOPICS: {
    BASE: "/topics",
    DETAIL: (id: string) => `/topics/${id}`,
  },
  CHAPTERS: {
    BASE: "/chapters",
    DETAIL: (id: string) => `/chapters/${id}`,
  },
  USERS: {
    BASE: "/users",
    DETAIL: (id: string) => `/users/${id}`,
  },
  QUESTIONS: {
    BASE: "/questions",
    DETAIL: (id: string) => `/questions/${id}`,
  },
  QUESTION_IMPORTS: {
    BASE: "/question-imports",
    DETAIL: (id: string) => `/question-imports/${id}`,
    COMPLETE: (id: string) => `/question-imports/${id}/complete`,
    ITEMS: (id: string) => `/question-imports/${id}/items`,
    ITEM: (id: string, itemId: string) =>
      `/question-imports/${id}/items/${itemId}`,
    COMMIT: (id: string) => `/question-imports/${id}/commit`,
  },
  EXAMS: {
    BASE: "/exams",
    DETAIL: (id: string) => `/exams/${id}`,
    PRINT: (id: string) => `/exams/${id}/print`,
    QUESTIONS: {
      BASE: (id: string) => `/exams/${id}/questions`,
      DETAIL: (id: string, questionId: string) =>
        `/exams/${id}/questions/${questionId}`,
    },
    REGISTRATIONS: {
      REQUEST: "/notification/exam/request-registration",
      APPROVE: "/notification/exam/approve-registration",
      ADD_STUDENT: "/notification/exam/add-student",
    },
  },
  EXAM_REGISTRATIONS: {
    BASE: "/exam-registrations",
    DETAIL: (id: string) => `/exam-registrations/${id}`,
  },
  SUBMISSIONS: {
    BASE: "/submission",
    DETAIL: (id: string) => `/submission/${id}`,
    START_EXAM: (examId: string) => `/submission/exams/${examId}/start`,
    EXAM_SESSION: (examId: string) => `/submission/exams/${examId}/session`,
    SUBMIT_QUESTION: "/submission/submit-by-question",
    SUBMIT_EXAM: "/submission/submit-exam",
    PDF: (id: string) => `/submission/${id}/pdf`,
    EXAM_PDF: (id: string) => `/submission/exam/${id}/pdf`,
    EXAM_REPORT_PDF: (id: string) => `/submission/exam/${id}/report-pdf`,
  },
  EXAM_RUNTIME: {
    STATUS: (examId: string) => `/exam-runtime/exams/${examId}/status`,
    EVENTS: (examId: string) => `/exam-runtime/exams/${examId}/events`,
    PING: (submissionId: string) =>
      `/exam-runtime/submissions/${submissionId}/ping`,
    VIOLATIONS: (submissionId: string) =>
      `/exam-runtime/submissions/${submissionId}/violations`,
    MONITOR_ROSTER: (examId: string) =>
      `/exam-runtime/monitor/exams/${examId}/roster`,
    MONITOR_EVENTS: (examId: string) =>
      `/exam-runtime/monitor/exams/${examId}/events`,
    GRANT_RETRY: (examId: string, studentId: string) =>
      `/exam-runtime/monitor/exams/${examId}/students/${studentId}/grant-retry`,
    EXTEND_TIME: (examId: string, studentId: string) =>
      `/exam-runtime/monitor/exams/${examId}/students/${studentId}/extend-time`,
  },
  FILES: {
    BASE: "/files",
    UPLOAD_URL: "/files/upload-url",
    CONFIRM: (id: string) => `/files/${id}/confirm`,
    VIEW_URL: (id: string) => `/files/${id}/view-url`,
    DOWNLOAD_URL: (id: string) => `/files/${id}/download-url`,
  },
  MODEL: {
    ACTION: (model: string, action: string) => `/model/${model}/${action}`,
  },
} as const;
