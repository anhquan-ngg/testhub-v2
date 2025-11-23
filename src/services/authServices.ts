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
};

export default authServices;
