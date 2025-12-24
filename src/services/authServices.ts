import axiosClient from "@/lib/axios";

const authServices = {
  login: (data: any) => {
    return axiosClient.post(
      "auth/login",
      { ...data },
      { withCredentials: true }
    );
  },
  signup: (data: any) => {
    return axiosClient.post(
      "auth/signup",
      { ...data },
      { withCredentials: true }
    );
  },
  logout: () => {
    return axiosClient.post("auth/logout", {}, { withCredentials: true });
  },
  loginGoogle: (data: { accessToken?: string; code?: string }) => {
    return axiosClient.post("auth/google-login", data, {
      withCredentials: true,
    });
  },
};

export default authServices;
