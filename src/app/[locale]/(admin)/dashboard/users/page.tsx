"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  UserCog,
  Search,
  EyeOff,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserRole } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEnumLabels } from "@/i18n/useEnumLabels";
import apiClient from "@/lib/api-client";
import { ENDPOINTS } from "@/constants/endpoints";

type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const enumLabel = useEnumLabels();
  const [users, setUsers] = useState([] as any);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState<{
    full_name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
  }>({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: UserRole.STUDENT,
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STUDENT);

  // Filtering and Sorting state
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<string>("desc"); // "desc" for newest, "asc" for oldest

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchUsers = useCallback(
    async (page = currentPage, limit = itemsPerPage, search = searchTerm) => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<PageResult<any>>(
          ENDPOINTS.USERS.BASE,
          {
            params: {
              page,
              limit,
              search: search || undefined,
              role: roleFilter === "ALL" ? undefined : roleFilter,
            },
          },
        );
        setUsers(response.data.data ?? []);
        setTotalCount(response.data.total ?? 0);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, itemsPerPage, roleFilter, searchTerm],
  );

  const handleAddUser = async () => {
    const newUser = {
      ...userForm,
    };
    try {
      await apiClient.post(ENDPOINTS.USERS.BASE, newUser);
      toast.success(t("userAddedSuccessfully"));
      await fetchUsers();
    } catch (err) {
      toast.error(t("anErrorOccurredWhileAddingA"));
      console.log(err);
    }
    setUserForm({
      full_name: "",
      email: "",
      password: "",
      phone: "",
      role: UserRole.STUDENT,
    });
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      await apiClient.patch(ENDPOINTS.USERS.DETAIL(userId), {
        role: selectedRole,
      });
      toast.success(t("updatedSuccessfully"));
      await fetchUsers();
    } catch (err) {
      toast.error(t("anErrorOccurredWhileUpdating"));
      console.log(err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiClient.delete(ENDPOINTS.USERS.DETAIL(userId));
      toast.success(t("userDeletionSuccessful"));
      await fetchUsers();
    } catch (err) {
      toast.error(t("anErrorOccurredWhileDeletingA"));
      console.log(err);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (error) {
      toast.error(t("anErrorOccurredWhileLoadingData"));
    }
  }, [error, t]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  const filteredUsers =
    users
      ?.filter((user: any) => {
        const matchesSearch =
          (user.full_name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
        return matchesSearch && matchesRole;
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      }) || [];

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">{t("userManagement")}</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              {t("addUsers")}</Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-300">
            <DialogHeader>
              <DialogTitle>{t("addNewUsers")}</DialogTitle>
              <DialogDescription>
                {t("enterNewUserInformation")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("fullName")}<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={t("enterFirstAndLastName")}
                  className="bg-white border-gray-300"
                  value={userForm.full_name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t("email")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("enterEmail")}
                  className="bg-white border-gray-300"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t("password")}<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("enterPassword")}
                    className="bg-white border-gray-300"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phoneNumber")}</Label>
                <Input
                  id="phone"
                  placeholder={t("enterPhoneNumber")}
                  className="bg-white border-gray-300"
                  value={userForm.phone}
                  onChange={(e) =>
                    setUserForm({ ...userForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">
                  {t("decentralization")}<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value: UserRole) =>
                    setUserForm({ ...userForm, role: value })
                  }
                >
                  <SelectTrigger className="bg-white border-gray-300">
                    <SelectValue placeholder={t("selectRole")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value={UserRole.STUDENT}>{t("candidate")}</SelectItem>
                    <SelectItem value={UserRole.LECTURER}>
                      {t("lecturer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                onClick={() => {
                  handleAddUser();
                }}
              >
                {t("more")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border-gray-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("listOfAccounts")}</CardTitle>
              <CardDescription>
                {t("addEditDeleteAndChangeUser")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground text-gray-500" />
              <Input
                placeholder={t("searchForUsers")}
                className="pl-10 border-gray-300 bg-white w-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] bg-white border-gray-300">
                  <SelectValue placeholder={t("filterByRole")} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="ALL">{t("allRoles")}</SelectItem>
                  <SelectItem value={UserRole.STUDENT}>{t("student")}</SelectItem>
                  <SelectItem value={UserRole.LECTURER}>{t("lecturer")}</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>{t("administrator")}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortOrder}
                onValueChange={(value) => {
                  setSortOrder(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px] bg-white border-gray-300">
                  <SelectValue placeholder={t("arrangeYourTime")} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300">
                  <SelectItem value="desc">{t("newestFirst")}</SelectItem>
                  <SelectItem value="asc">{t("oldestFirst")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-300">
                <TableHead>{t("fullName")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("phoneNumber")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead className="text-right">{t("operation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user: any) => (
                <TableRow key={user.id} className="border-gray-300">
                  <TableCell className="font-medium">
                    {user.full_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user?.phone || t("notUpdatedYet")}</TableCell>
                  <TableCell>
                    <Badge
                      className={`px-2 py-1 text-white rounded-lg ${
                        user.role === "ADMIN"
                          ? "text-red-500 bg-red-100"
                          : user.role === "LECTURER"
                            ? "text-green-500 bg-green-100"
                            : "text-blue-500 bg-blue-100"
                      }`}
                    >
                      {enumLabel.userRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setSelectedRole(user.role as UserRole)
                            }
                            className="hover:cursor-pointer"
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-gray-300">
                          <DialogHeader>
                            <DialogTitle>{t("changePermissions")}</DialogTitle>
                            <DialogDescription>
                              {t("changeUserRole", { name: user.full_name })}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>
                                {t("currentRole")}{" "}
                                {enumLabel.userRole(user.role)}
                              </Label>
                              <Select
                                value={selectedRole}
                                onValueChange={(value: UserRole) =>
                                  setSelectedRole(value)
                                }
                              >
                                <SelectTrigger className="bg-white border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-300">
                                  <SelectItem value={UserRole.STUDENT}>
                                    {t("candidate")}</SelectItem>
                                  <SelectItem value={UserRole.LECTURER}>
                                    {t("lecturer")}</SelectItem>
                                  <SelectItem value={UserRole.ADMIN}>
                                    {t("administrator")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                              onClick={() => handleUpdateRole(user.id)}
                            >
                              {t("update")}</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirmDeletion")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteUserConfirmation", { name: user.full_name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="hover:cursor-pointer">
                              {t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white hover:cursor-pointer border-none"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              {t("confirmDeletion")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("before")}</Button>
              <div className="text-sm font-medium">
                {t("pageOf", { page: currentPage, total: totalPages })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="bg-[#0066cc] hover:bg-[#0052a3] border-none text-white hover:cursor-pointer"
                disabled={currentPage === totalPages}
              >
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
