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
  EXAMS: {
    BASE: "/exams",
    DETAIL: (id: string) => `/exams/${id}`,
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
