"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { loadAuth } from "@/lib/auth-storage";
import { categories } from "@/lib/categories";
import {
  createUser,
  deleteUser,
  getUsers,
  getTeams,
  TEAM_LABELS,
  updateUser,
  type PanelUser,
  type Team,
  type TeamItem,
  type UserRole,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Kullanıcı adı en az 3 karakter olmalıdır.")
      .max(50, "Kullanıcı adı çok uzun."),
    password: z
      .string()
      .min(6, "Şifre en az 6 karakter olmalıdır.")
      .max(100, "Şifre çok uzun."),
    fullName: z.string().trim().max(120).optional(),
    role: z.enum(["admin", "personnel"]),
    // Birimler dinamik; sunucu doğrular.
    team: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "personnel" && !value.team) {
      ctx.addIssue({
        code: "custom",
        path: ["team"],
        message: "Personel için bir birim seçilmelidir.",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function AdminUsersPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [users, setUsers] = useState<PanelUser[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<PanelUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<PanelUser | null>(null);
  // Kategori atama pop-up'ı
  const [categoryUser, setCategoryUser] = useState<PanelUser | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editForm, setEditForm] = useState<{
    username: string;
    fullName: string;
    password: string;
    role: UserRole;
    team: Team | "";
    isActive: boolean;
  }>({
    username: "",
    fullName: "",
    password: "",
    role: "personnel",
    team: "",
    isActive: true,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "personnel",
      team: "",
    },
  });

  const role = watch("role");

  // Admin değilse erişimi engelle (sunucu da ayrıca zorluyor).
  useEffect(() => {
    const auth = loadAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    if (auth.user.role !== "admin") {
      router.replace("/");
      return;
    }
    setIsAdmin(true);
    setCurrentUserId(auth.user.id);
    setAuthChecked(true);
  }, [router]);

  const refreshUsers = async () => {
    try {
      const list = await getUsers();
      setUsers(list);
      setUsersError(null);
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Kullanıcılar getirilemedi."
      );
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void refreshUsers();
      void getTeams()
        .then(setTeams)
        .catch(() => {});
    }
  }, [isAdmin]);

  // Rol admin'e çevrilince birim alanını temizle.
  useEffect(() => {
    if (role === "admin") setValue("team", "");
  }, [role, setValue]);

  const openEditDialog = (user: PanelUser) => {
    setEditError(null);
    setEditingUser(user);
    setEditForm({
      username: user.username,
      fullName: user.fullName || "",
      password: "",
      role: user.role,
      team: (user.team || "") as Team | "",
      isActive: user.isActive !== false,
    });
  };

  const closeEditDialog = () => {
    setEditingUser(null);
    setEditError(null);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setEditError(null);

    const trimmedUsername = editForm.username.trim();
    if (trimmedUsername.length < 3) {
      setEditError("Kullanıcı adı en az 3 karakter olmalıdır.");
      return;
    }
    if (editForm.role === "personnel" && !editForm.team) {
      setEditError("Personel için bir birim seçilmelidir.");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    const payload = {
      username: trimmedUsername,
      fullName: editForm.fullName.trim() || null,
      role: editForm.role,
      team:
        editForm.role === "personnel" ? (editForm.team as Team) : null,
      isActive: editForm.isActive,
      ...(editForm.password ? { password: editForm.password } : {}),
    };

    setIsSavingEdit(true);
    try {
      await updateUser(editingUser.id, payload);
      setSuccessMessage(`"${trimmedUsername}" kullanıcısı güncellendi.`);
      closeEditDialog();
      void refreshUsers();
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "Kullanıcı güncellenirken bir hata oluştu."
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openCategoryDialog = (user: PanelUser) => {
    setCategoryError(null);
    setSelectedCategories(user.assignedCategories || []);
    setCategoryUser(user);
  };

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleCategorySave = async () => {
    if (!categoryUser) return;
    setCategoryError(null);
    setIsSavingCategories(true);
    try {
      await updateUser(categoryUser.id, {
        assignedCategories: selectedCategories,
      });
      setSuccessMessage(
        `"${categoryUser.username}" kullanıcısına ${selectedCategories.length} kategori atandı.`
      );
      setCategoryUser(null);
      void refreshUsers();
    } catch (error) {
      setCategoryError(
        error instanceof Error
          ? error.message
          : "Kategoriler kaydedilirken bir hata oluştu."
      );
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteUser(deletingUser.id);
      setSuccessMessage(`"${deletingUser.username}" kullanıcısı silindi.`);
      setDeletingUser(null);
      void refreshUsers();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Kullanıcı silinirken bir hata oluştu."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const created = await createUser({
        username: values.username,
        password: values.password,
        fullName: values.fullName || undefined,
        role: values.role,
        team:
          values.role === "personnel"
            ? (values.team as PanelUser["team"])
            : null,
      });

      setSuccessMessage(
        `"${created.username}" kullanıcısı oluşturuldu${
          created.team ? ` (${TEAM_LABELS[created.team]})` : ""
        }.`
      );
      reset({
        username: "",
        password: "",
        fullName: "",
        role: "personnel",
        team: "",
      });
      void refreshUsers();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Kullanıcı oluşturulurken bir hata oluştu."
      );
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbf9] text-sm text-slate-500">
        Yükleniyor...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              aria-label="Ana sayfaya git"
              className="flex flex-col items-end leading-none"
            >
              <span className="text-3xl font-semibold tracking-tight text-slate-700">
                Jefedes<span className="text-emerald-500">.</span>
              </span>
              <span className="-mt-0.5 -translate-x-1 text-xs font-medium tracking-wide text-slate-400">
                Lead Flow
              </span>
            </Link>

          </div>

          <div className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Kullanıcı Yönetimi
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Yeni personel ekleyin ve birimini belirleyin. Yalnızca admin
              kullanıcılar bu sayfaya erişebilir.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Kullanıcı ekleme formu */}
          <Card className="h-fit rounded-3xl bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Kullanıcı Ekle
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="username"
                    className="text-xs font-medium text-slate-600"
                  >
                    Kullanıcı Adı
                  </label>
                  <Input
                    id="username"
                    autoComplete="off"
                    placeholder="ör. saha_ahmet"
                    className="h-10 rounded-xl"
                    {...register("username")}
                  />
                  {errors.username && (
                    <span className="text-xs text-red-600">
                      {errors.username.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="fullName"
                    className="text-xs font-medium text-slate-600"
                  >
                    Ad Soyad{" "}
                    <span className="text-slate-400">(opsiyonel)</span>
                  </label>
                  <Input
                    id="fullName"
                    autoComplete="off"
                    placeholder="ör. Ahmet Yılmaz"
                    className="h-10 rounded-xl"
                    {...register("fullName")}
                  />
                  {errors.fullName && (
                    <span className="text-xs text-red-600">
                      {errors.fullName.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-slate-600"
                  >
                    Şifre
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="En az 6 karakter"
                    className="h-10 rounded-xl"
                    {...register("password")}
                  />
                  {errors.password && (
                    <span className="text-xs text-red-600">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Rol
                  </label>
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="Rol seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personnel">Personel</SelectItem>
                          <SelectItem value="admin">Yönetici (admin)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {role === "personnel" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-600">
                      Birim
                    </label>
                    <Controller
                      control={control}
                      name="team"
                      render={({ field }) => (
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="h-10 rounded-xl">
                            <SelectValue placeholder="Birim seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((t) => (
                              <SelectItem key={t.code} value={t.code}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.team && (
                      <span className="text-xs text-red-600">
                        {errors.team.message as string}
                      </span>
                    )}
                  </div>
                )}

                {submitError && (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {submitError}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    {successMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  {isSubmitting ? "Ekleniyor..." : "Kullanıcı Ekle"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Mevcut kullanıcılar */}
          <Card className="rounded-3xl bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Kullanıcılar{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({users.length})
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {usersError ? (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {usersError}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz kullanıcı yok.</p>
              ) : (
                <div className="overflow-hidden rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Kullanıcı</th>
                        <th className="px-4 py-2.5 font-medium">Rol</th>
                        <th className="px-4 py-2.5 font-medium">Birim</th>
                        <th className="px-4 py-2.5 font-medium">Durum</th>
                        <th className="px-4 py-2.5 text-right font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => {
                        const isSelf = currentUserId === user.id;
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-slate-900">
                                {user.username}
                              </div>
                              {user.fullName && (
                                <div className="text-xs text-slate-400">
                                  {user.fullName}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  user.role === "admin"
                                    ? "bg-slate-950 text-white"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {user.role === "admin" ? "Yönetici" : "Personel"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {user.team ? TEAM_LABELS[user.team] : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium ${
                                  user.isActive !== false
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    user.isActive !== false
                                      ? "bg-emerald-500"
                                      : "bg-slate-300"
                                  }`}
                                />
                                {user.isActive !== false ? "Aktif" : "Pasif"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-slate-200 px-3 text-xs"
                                  onClick={() => openEditDialog(user)}
                                >
                                  Düzenle
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-emerald-200 px-3 text-xs text-emerald-700 hover:bg-emerald-50"
                                  title={
                                    user.assignedCategories?.length
                                      ? `${user.assignedCategories.length} kategori atanmış`
                                      : "Kategori ata"
                                  }
                                  onClick={() => openCategoryDialog(user)}
                                >
                                  Kategori Ata
                                  {user.assignedCategories?.length ? (
                                    <span className="ml-1 rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold">
                                      {user.assignedCategories.length}
                                    </span>
                                  ) : null}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                                  disabled={isSelf}
                                  title={
                                    isSelf
                                      ? "Kendi hesabınızı silemezsiniz"
                                      : "Kullanıcıyı sil"
                                  }
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeletingUser(user);
                                  }}
                                >
                                  Sil
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Düzenleme dialogu */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
            <DialogDescription>
              Bilgileri güncelleyin. Şifre boş bırakılırsa değişmez.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                Kullanıcı Adı
              </label>
              <Input
                value={editForm.username}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, username: e.target.value }))
                }
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                Ad Soyad <span className="text-slate-400">(opsiyonel)</span>
              </label>
              <Input
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, fullName: e.target.value }))
                }
                className="h-10 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                Yeni Şifre{" "}
                <span className="text-slate-400">
                  (boş bırakılırsa değişmez)
                </span>
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, password: e.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder="En az 6 karakter"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">Rol</label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm((f) => ({
                    ...f,
                    role: value as UserRole,
                    team: value === "admin" ? "" : f.team,
                  }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personnel">Personel</SelectItem>
                  <SelectItem value="admin">Yönetici (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.role === "personnel" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Birim
                </label>
                <Select
                  value={editForm.team || ""}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, team: value as Team }))
                  }
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Birim seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                disabled={!!editingUser && currentUserId === editingUser.id}
              />
              Aktif
            </label>

            {editError && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {editError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={closeEditDialog}
              disabled={isSavingEdit}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={handleEditSave}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kategori atama dialogu */}
      <Dialog
        open={!!categoryUser}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryUser(null);
            setCategoryError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kategori Ata</DialogTitle>
            <DialogDescription>
              {categoryUser ? (
                <>
                  <span className="font-medium text-slate-900">
                    {categoryUser.username}
                  </span>{" "}
                  kullanıcısı yalnızca seçilen kategorilerdeki görüşme
                  kayıtlarını görüntüleyebilir. Hiçbiri seçilmezse kısıt
                  uygulanmaz.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{selectedCategories.length} kategori seçili</span>
            <button
              type="button"
              className="font-medium text-emerald-600 hover:underline"
              onClick={() => setSelectedCategories([])}
            >
              Temizle
            </button>
          </div>

          <div className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-100 p-2 sm:grid-cols-2">
            {categories.map((cat) => (
              <label
                key={cat.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={selectedCategories.includes(cat.value)}
                  onChange={() => toggleCategory(cat.value)}
                />
                {cat.label}
              </label>
            ))}
          </div>

          {categoryError && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {categoryError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setCategoryUser(null)}
              disabled={isSavingCategories}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={handleCategorySave}
              disabled={isSavingCategories}
            >
              {isSavingCategories ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme onay dialogu */}
      <Dialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kullanıcıyı sil?</DialogTitle>
            <DialogDescription>
              {deletingUser ? (
                <>
                  <span className="font-medium text-slate-900">
                    {deletingUser.username}
                  </span>{" "}
                  kullanıcısı kalıcı olarak silinecek. Bu işlem geri alınamaz.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setDeletingUser(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Siliniyor..." : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
