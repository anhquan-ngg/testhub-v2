import authServices from "@/services/authServices";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const router = useRouter();

  const handleLogin = async ({ email, password }: LoginCredentials) => {
    try {
      console.log({ email, password });
      const res = await authServices.login({ email, password });
      if (res.status === 200) {
        console.log(res.data);
        toast.success("Login successfully");
        if (res.data.role === "ADMIN") {
          router.push("/dashboard");
        } else if (res.data.role === "STUDENT") {
          router.push("/home");
        }
      }
    } catch (error) {
      console.error("Error when login:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await authServices.logout();
      if (res.status === 200) {
        console.log(res.data);
        toast.success("Logout successfully");
        // Logic xóa token/session ở client
        router.push("/login");
      }
    } catch (error) {
      console.error("Error when logout:", error);
      toast.error("Logout failed.");
    }
  };

  // Bạn có thể trả về các hàm và state khác ở đây
  return { handleLogin, handleLogout };
};
