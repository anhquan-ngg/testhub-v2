export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STUDENT" | "LECTURER";
  avatar?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
