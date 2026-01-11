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
      const res = await authServices.login({ email, password });
      if (res.status === 200) {
        // Lưu thông tin user vào Redux store
        const userData = res.data;

        const userRole = userData.role || "STUDENT";

        dispatch(
          loginAction({
            id: userData.id || userData.userId || "",
            full_name:
              userData.full_name || userData.fullName || userData.name || "",
            email: userData.email || email,
            avatar_url: userData.avatar_url ?? null,
            role: userRole,
          })
        );

        toast.success("Đăng nhập thành công", {
          className: "bg-green-600 text-white border-none",
        });

        if (userRole === "ADMIN") {
          router.push("/dashboard");
        } else if (userRole === "LECTURER") {
          router.push("/lecturer/exams");
        } else {
          router.push("/home");
        }
      }
    } catch (error) {
      console.error("Error when login:", error);
      toast.error("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.");
    }
  };

  const handleGoogleLogin = async (data: {
    accessToken?: string;
    code?: string;
  }) => {
    try {
      const res = await authServices.loginGoogle(data);
      if (res.status === 200 || res.status === 201) {
        const userData = res.data;
        // If the backend returns access_token in root or inside user object, handle it.
        // The snippet did: localStorage.setItem("access_token", res.data.access_token);
        // We should probably do that too if needed, but the original login doesn't seem to set localStorage explicitly in the code I saw?
        // Wait, check handleLogin again. line 19-57. It does NOT set localStorage.
        // It relies on cookies (withCredentials: true) or maybe it forgets?
        // But the user snippet explicitly asked for: localStorage.setItem("access_token", res.data.access_token);
        // So I MUST include that.

        if (userData.access_token) {
          localStorage.setItem("access_token", userData.access_token);
        }

        const userRole = userData.role || "STUDENT";

        dispatch(
          loginAction({
            id: userData.id || userData.userId || "",
            full_name:
              userData.full_name || userData.fullName || userData.name || "",
            email: userData.email,
            avatar_url: userData.avatar_url ?? null,
            role: userRole,
          })
        );

        toast.success("Đăng nhập bằng Google thành công", {
          className: "bg-green-600 text-white border-none",
        });

        if (userRole === "ADMIN") {
          router.push("/dashboard");
        } else if (userRole === "LECTURER") {
          router.push("/lecturer/exams");
        } else {
          router.push("/home");
        }
      }
    } catch (error) {
      console.error("Error when login with Google:", error);
      toast.error("Đăng nhập bằng Google thất bại.");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await authServices.logout();
      if (res.status === 200) {
        // Xóa thông tin user khỏi Redux store
        dispatch(logoutAction());

        toast.success("Đăng xuất thành công");
        router.push("/login");
      }
    } catch (error) {
      console.error("Error when logout:", error);
      // Vẫn xóa thông tin user khỏi store ngay cả khi API call thất bại
      dispatch(logoutAction());
      toast.error("Đăng xuất thất bại");
      router.push("/login");
    }
  };

  return { handleLogin, handleLogout, handleGoogleLogin };
};
