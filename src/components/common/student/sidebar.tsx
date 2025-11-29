"use client";

import { FileText, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const StudentSideBar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-52 bg-white shadow-lg flex flex-col">
      <div className="p-6 flex items-center justify-center border-b border-gray-300">
        <Link href="/">
          <h1 className="text-2xl font-bold text-[#0066cc]">TESTHUB</h1>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <Link href="/home">
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${
              pathname === "/home"
                ? "bg-blue-50 text-[#0066cc]"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium">Bài thi</span>
          </button>
        </Link>
        <Link href="/profile">
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-2 ${
              pathname === "/profile"
                ? "bg-blue-50 text-[#0066cc]"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="font-medium">Tài khoản</span>
          </button>
        </Link>
      </nav>
    </aside>
  );
};

export default StudentSideBar;
