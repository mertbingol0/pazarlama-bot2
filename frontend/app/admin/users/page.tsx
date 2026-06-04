"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageNavigation } from "@/components/PageNavigation";
import { loadAuth } from "@/lib/auth-storage";
import {
  createUser,
  getUsers,
  TEAM_LABELS,
  TEAM_OPTIONS,
  type PanelUser,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEAM_VALUES = TEAM_OPTIONS.map((option) => option.value) as [
  string,
  ...string[]
];

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
    team: z.union([z.enum(TEAM_VALUES), z.literal("")]).optional(),
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

  const [users, setUsers] = useState<PanelUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    if (isAdmin) void refreshUsers();
  }, [isAdmin]);

  // Rol admin'e çevrilince birim alanını temizle.
  useEffect(() => {
    if (role === "admin") setValue("team", "");
  }, [role, setValue]);

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

            <PageNavigation />
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
          <Card className="h-fit rounded-3xl border border-emerald-100/80 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)]">
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
                            {TEAM_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {submitError}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
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
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.25)]">
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
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {usersError}
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-500">Henüz kullanıcı yok.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Kullanıcı</th>
                        <th className="px-4 py-2.5 font-medium">Rol</th>
                        <th className="px-4 py-2.5 font-medium">Birim</th>
                        <th className="px-4 py-2.5 font-medium">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
