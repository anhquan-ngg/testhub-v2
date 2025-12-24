import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hook/useAuth";
import { useAppSelector } from "@/store/hook";
import { ChevronDown, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

const StudentMenu = () => {
  const full_name = useAppSelector((state) => state.user.full_name);
  const router = useRouter();
  const { handleLogout } = useAuth();

  return (
    <header className="bg-transparent p-6 flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 bg-white/50 hover:bg-white/80 hover:cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <span className="font-medium">{full_name}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-white border-gray-300"
        >
          <DropdownMenuItem
            className="hover:cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              router.push("/profile");
            }}
          >
            Thông tin cá nhân
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600 hover:cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default StudentMenu;
