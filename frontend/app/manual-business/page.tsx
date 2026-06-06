"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageNavigation } from "@/components/PageNavigation";
import { loadAuth } from "@/lib/auth-storage";
import {
  createManualBusiness,
  getAssignableUsers,
  lookupBusiness,
  CHANNEL_OPTIONS,
  OUTCOME_OPTIONS,
  type AssignableUser,
  type InteractionChannel,
} from "@/lib/api";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHANNEL_VALUES = CHANNEL_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];
const OUTCOME_VALUES = OUTCOME_OPTIONS.map((o) => o.value) as [
  string,
  ...string[]
];

const formSchema = z.object({
  name: z.string().trim().min(2, "İşletme adı zorunludur."),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  category: z.string().trim().optional(),
  city: z.string().trim().optional(),
  district: z.string().trim().optional(),
  address: z.string().trim().optional(),
  website: z.string().trim().optional(),
  socials: z.string().trim().optional(),
  channel: z.union([z.enum(CHANNEL_VALUES), z.literal("")]).optional(),
  outcome: z.union([z.enum(OUTCOME_VALUES), z.literal("")]).optional(),
  assignedUserId: z.string().optional(),
  note: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function userLabel(user: AssignableUser) {
  return user.fullName ? `${user.fullName} (${user.username})` : user.username;
}

export default function ManualBusinessPage() {
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentUserId = loadAuth()?.user?.id ?? null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      category: "",
      city: "",
      district: "",
      address: "",
      website: "",
      socials: "",
      channel: "",
      outcome: "",
      assignedUserId: currentUserId ? String(currentUserId) : "",
      note: "",
    },
  });

  useEffect(() => {
    getAssignableUsers()
      .then(setAssignableUsers)
      .catch(() => {
        /* sessizce yoksay */
      });
  }, []);

  // Google Maps'te araştır → bilgileri doldur.
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lookupOk, setLookupOk] = useState(false);

  const handleLookup = async () => {
    const { name, city, district } = getValues();
    setLookupMessage(null);
    setLookupOk(false);

    if (!name || !name.trim()) {
      setLookupMessage("Önce işletme adını girin.");
      return;
    }

    setLookupLoading(true);
    try {
      const result = await lookupBusiness({ name, city, district });
      if (!result) {
        setLookupMessage("Bu bilgilerle Google Maps'te işletme bulunamadı.");
        return;
      }

      const fill = (
        field: keyof FormValues,
        value: string | null | undefined
      ) => {
        if (value) setValue(field, value, { shouldValidate: true });
      };

      fill("name", result.name);
      fill("phone", result.phone);
      fill("email", result.email);
      fill("city", result.city);
      fill("district", result.district);
      fill("address", result.address);
      fill("website", result.website);
      fill("socials", result.socials);

      setLookupOk(true);
      setLookupMessage("Bilgiler Google Maps'ten dolduruldu.");
    } catch (err) {
      setLookupMessage(
        err instanceof Error ? err.message : "Araştırma başarısız oldu."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      await createManualBusiness({
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        category: values.category || undefined,
        city: values.city || undefined,
        district: values.district || undefined,
        address: values.address || undefined,
        website: values.website || undefined,
        socials: values.socials || undefined,
        channel: (values.channel || "") as InteractionChannel | "",
        outcome: values.outcome || "",
        assignedUserId: values.assignedUserId
          ? Number(values.assignedUserId)
          : null,
        note: values.note || undefined,
      });

      setSuccessMessage(`"${values.name}" işletmesi eklendi.`);
      reset({
        name: "",
        phone: "",
        email: "",
        category: "",
        city: "",
        district: "",
        address: "",
        website: "",
        socials: "",
        channel: "",
        outcome: "",
        assignedUserId: currentUserId ? String(currentUserId) : "",
        note: "",
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "İşletme eklenemedi."
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl">
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
              Manuel İşletme Ekle
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sahada iletişime geçtiğiniz bir işletmeyi tüm bilgileri, görüşme
              sonucu ve notuyla birlikte ekleyin.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* İşletme bilgileri */}
          <Card className="rounded-3xl bg-white">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold text-slate-900">
                  İşletme Bilgileri
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="h-9 gap-1.5 rounded-xl"
                >
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  {lookupLoading ? "Aranıyor..." : "Google Maps'te Araştır"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Ad, il ve ilçeyi girip araştırın; telefon, adres, web sitesi gibi
                bilgiler otomatik dolar.
              </p>
              {lookupMessage && (
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    lookupOk ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {lookupMessage}
                </p>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="İşletme Adı *" error={errors.name?.message}>
                <Input
                  className="h-10 rounded-xl"
                  placeholder="ör. Moda Berber"
                  {...register("name")}
                />
              </Field>
              <Field label="Telefon">
                <Input
                  className="h-10 rounded-xl"
                  placeholder="05xx xxx xx xx"
                  {...register("phone")}
                />
              </Field>
              <Field label="E-posta">
                <Input className="h-10 rounded-xl" {...register("email")} />
              </Field>
              <Field label="Sektör / Kategori">
                <Input
                  className="h-10 rounded-xl"
                  placeholder="ör. kuaför"
                  {...register("category")}
                />
              </Field>
              <Field label="İl">
                <Input className="h-10 rounded-xl" {...register("city")} />
              </Field>
              <Field label="İlçe">
                <Input className="h-10 rounded-xl" {...register("district")} />
              </Field>
              <Field label="Adres" full>
                <Input className="h-10 rounded-xl" {...register("address")} />
              </Field>
              <Field label="Web Sitesi">
                <Input className="h-10 rounded-xl" {...register("website")} />
              </Field>
              <Field label="Sosyal Medya">
                <Input
                  className="h-10 rounded-xl"
                  placeholder="instagram vb."
                  {...register("socials")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Görüşme */}
          <Card className="rounded-3xl bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Görüşme
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="İletişim Kanalı">
                <Controller
                  control={control}
                  name="channel"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Görüşme Sonucu">
                <Controller
                  control={control}
                  name="outcome"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOME_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="İletişime Geçen Personel" full>
                <Controller
                  control={control}
                  name="assignedUserId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="Personel seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableUsers.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {userLabel(u)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Not" full>
                <Textarea
                  className="min-h-[72px] rounded-xl"
                  placeholder="Görüşme notu..."
                  {...register("note")}
                />
              </Field>
            </CardContent>
          </Card>

          {submitError && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {submitError}
            </div>
          )}
          {successMessage && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <span>{successMessage}</span>
              <Link
                href="/contacted-businesses"
                className="underline underline-offset-2"
              >
                İletişime Geçilenler&apos;de gör
              </Link>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-xl bg-emerald-500 px-6 text-white hover:bg-emerald-600"
            >
              {isSubmitting ? "Ekleniyor..." : "İşletmeyi Ekle"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
