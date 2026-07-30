import apiClient from "@/lib/api-client";
import { LoginPayload, SignupPayload } from "@/types/auth.types";

const authServices = {
  login: async (payload: LoginPayload) => {
    return apiClient.post("auth/login", payload, {
      withCredentials: true,
    });
  },
  signup: async (payload: SignupPayload) => {
    return apiClient.post("auth/signup", payload, {
      withCredentials: true,
    });
  },
  logout: async () => {
    return apiClient.post("auth/logout", {}, { withCredentials: true });
  },
  me: async () => {
    return apiClient.get("auth/me", { withCredentials: true });
  },
};

export default authServices;
