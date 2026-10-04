import authServices from "@/services/authServices";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAppDispatch } from "@/store/hook";
import { LoginPayload } from "@/types/auth.types";
import { clearAuth, setUser } from "@/store/slices/authSlice";

export const useAuth = () => {
  const t = useTranslations("auth");
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogin = async (payload: LoginPayload) => {
    try {
      const loginResponse = await authServices.login(payload);

      if (loginResponse.status !== 200) {
        toast.error(t("login.failed"));
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
          school: userData.school ?? "",
          phone: userData.phone ?? "",
          address: userData.address ?? "",
          avatar_url: userData.avatar_url ?? null,
          role: userRole,
        }),
      );

      toast.success(t("login.success"), {
        className: "bg-green-600 text-white border-none",
      });

      if (userRole === "ADMIN") {
        router.push("/dashboard");
      } else if (userRole === "LECTURER") {
        router.push("/lecturer");
      } else {
        router.push("/home");
      }
    } catch (error) {
      console.error("Error when login:", error);
      toast.error(t("login.failed"));
    }
  };
  const handleGoogleLogin = async () => {
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  const handleOutlookLogin = async () => {};

  const handleLogout = async () => {
    try {
      const res = await authServices.logout();
      if (res.status === 200) {
        dispatch(clearAuth());
        toast.success(t("logout.success"));
        router.push("/login");
      } else {
        toast.error(t("logout.failed"));
      }
    } catch (error) {
      console.error("Error when logout:", error);
      dispatch(clearAuth());
      toast.error(t("logout.failed"));
      router.push("/login");
    }
  };

  return { handleLogin, handleLogout, handleGoogleLogin, handleOutlookLogin };
};
