import authServices from "@/services/authServices";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/hook";
import {
  login as loginAction,
  logout as logoutAction,
} from "@/store/slices/userSlice";

interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogin = async ({ email, password }: LoginCredentials) => {
    try {
      console.log({ email, password });
      const res = await authServices.login({ email, password });
      if (res.status === 200) {
        console.log("API Response:", res.data);

        // Lưu thông tin user vào Redux store
        const userData = res.data;
        console.log("avatar_url from API:", userData.avatar_url);

        dispatch(
          loginAction({
            id: userData.id || userData.userId || "",
            full_name:
              userData.full_name || userData.fullName || userData.name || "",
            email: userData.email || email,
            avatar_url: userData.avatar_url ?? null,
            role: userData.role || "STUDENT",
          })
        );

        toast.success("Login successfully", {
          className: "bg-green-600 text-white border-none",
        });

        if (userData.role === "ADMIN") {
          router.push("/dashboard");
        } else if (userData.role === "STUDENT") {
          router.push("/home");
        } else if (userData.role === "LECTURER") {
          router.push("/lecturer/exams");
        }
      }
    } catch (error) {
      console.error("Error when login:", error);
      toast.error("Login failed. Please check your credentials.");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await authServices.logout();
      if (res.status === 200) {
        console.log(res.data);

        // Xóa thông tin user khỏi Redux store
        dispatch(logoutAction());

        toast.success("Logout successfully");
        router.push("/login");
      }
    } catch (error) {
      console.error("Error when logout:", error);
      // Vẫn xóa thông tin user khỏi store ngay cả khi API call thất bại
      dispatch(logoutAction());
      toast.error("Logout failed.");
      router.push("/login");
    }
  };

  return { handleLogin, handleLogout };
};
