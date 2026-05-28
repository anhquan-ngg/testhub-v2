import authServices from "@/services/authServices";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/hook";
import { LoginPayload } from "@/types/auth.types";
import { clearAuth, setUser } from "@/store/slices/authSlice";

export const useAuth = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogin = async (payload: LoginPayload) => {
    try {
      const loginResponse = await authServices.login(payload);

      if (loginResponse.status !== 200) {
        toast.error(
          "Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.",
        );
        return;
      }

      const meResponse = await authServices.me();
      const userData = meResponse.data;
      const userRole = userData.role || "STUDENT";

      dispatch(
        setUser({
          id: userData.id || userData.userId || "",
          full_name:
            userData.full_name || userData.fullName || userData.name || "",
          email: userData.email || payload.email,
          avatar_url: userData.avatar_url ?? null,
          role: userRole,
        }),
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
    } catch (error) {
      console.error("Error when login:", error);
      toast.error("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.");
    }
  };
  const handleGoogleLogin = async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  const handleLogout = async () => {
    try {
      const res = await authServices.logout();
      if (res.status === 200) {
        dispatch(clearAuth());
        toast.success("Đăng xuất thành công");
        router.push("/login");
      } else {
        toast.error("Đăng xuất thất bại");
      }
    } catch (error) {
      console.error("Error when logout:", error);
      dispatch(clearAuth());
      toast.error("Đăng xuất thất bại");
      router.push("/login");
    }
  };

  return { handleLogin, handleLogout, handleGoogleLogin };
};
