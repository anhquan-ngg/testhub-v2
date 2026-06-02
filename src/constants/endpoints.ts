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
  QUESTIONS: {
    BASE: "/questions",
    DETAIL: (id: string) => `/questions/${id}`,
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
