"use client";

import { useMemo, useState } from "react";
import type { Business } from "@/types/business";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppTestMessage,
} from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEST_PHONE_NUMBER = "905313439734";
const BUTTON_WEBHOOK_TEST_PHONE = "905300448478";
const TEMPLATE_LANGUAGE_CODE = "tr";

type TemplateTargetMode = "all_eligible" | "selected_only";

type WhatsAppBusinessPanelProps = {
  businesses?: Business[];
  selectedBusinesses?: Business[];
  selectedPhoneCount?: number;
  onClearSelections?: () => void;
};

type BusinessForWhatsApp = Business & {
  businessId?: string | number;
  phone?: string | null;
  name?: string | null;
};

function getBusinessId(business: BusinessForWhatsApp) {
  return business.id ?? business.businessId;
}

function hasUsablePhone(business: BusinessForWhatsApp) {
  return Boolean(String(business.phone || "").trim());
}

function hasUsableId(business: BusinessForWhatsApp) {
  const businessId = getBusinessId(business);
  return businessId !== undefined && businessId !== null;
}

function hasTemplateAlreadySent(business: BusinessForWhatsApp) {
  const whatsappStatus = business.whatsappStatus || "not_sent";

  return (
    Boolean(business.templateSentAt) ||
    whatsappStatus === "template_sent" ||
    whatsappStatus === "replied" ||
    whatsappStatus === "follow_up" ||
    whatsappStatus === "not_interested"
  );
}
function canSendManualMessageToBusiness(business: BusinessForWhatsApp) {
  const whatsappStatus = business.whatsappStatus || "not_sent";

  return (
    hasUsableId(business) &&
    hasUsablePhone(business) &&
    (whatsappStatus === "replied" || whatsappStatus === "follow_up")
  );
}
function hasFinalOutcome(business: BusinessForWhatsApp) {
  return business.status === "approved" || business.status === "rejected";
}

function isTemplateEligible(business: BusinessForWhatsApp) {
  return (
    hasUsableId(business) &&
    hasUsablePhone(business) &&
    !hasTemplateAlreadySent(business) &&
    !hasFinalOutcome(business)
  );
}

function getEligibleBusinesses(businesses: BusinessForWhatsApp[]) {
  return businesses.filter(isTemplateEligible);
}

function mergeUniqueBusinessesById(businesses: BusinessForWhatsApp[]) {
  const uniqueBusinesses = new Map<string, BusinessForWhatsApp>();

  businesses.forEach((business) => {
    const businessId = getBusinessId(business);

    if (businessId !== undefined && businessId !== null) {
      uniqueBusinesses.set(String(businessId), business);
    }
  });

  return Array.from(uniqueBusinesses.values());
}

export function WhatsAppBusinessPanel({
  businesses = [],
  selectedBusinesses = [],
  selectedPhoneCount = 0,
  onClearSelections,
}: WhatsAppBusinessPanelProps) {
  const [to, setTo] = useState(TEST_PHONE_NUMBER);
  const [templateName, setTemplateName] = useState("jefedes_kuafor");
  const [manualTemplateName, setManualTemplateName] = useState("jefedes_kuafor");
  const [targetMode, setTargetMode] =
    useState<TemplateTargetMode>("selected_only");

  const [message, setMessage] = useState(
    "Merhaba, işletmenizle iletişime geçmek istiyoruz."
  );

  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentBusinesses = businesses as BusinessForWhatsApp[];
  const currentSelectedBusinesses = selectedBusinesses as BusinessForWhatsApp[];

  const eligibleBusinesses = useMemo(() => {
    return getEligibleBusinesses(currentBusinesses);
  }, [currentBusinesses]);

  const eligibleSelectedBusinesses = useMemo(() => {
    return getEligibleBusinesses(currentSelectedBusinesses);
  }, [currentSelectedBusinesses]);
  const manualMessageBusinesses = useMemo(() => {
  return currentSelectedBusinesses.filter(canSendManualMessageToBusiness);
}, [currentSelectedBusinesses]);

const manualTargetBusiness = manualMessageBusinesses[0];

  const templateTargetBusinesses = useMemo(() => {
    if (targetMode === "all_eligible") {
      return eligibleBusinesses;
    }

    return eligibleSelectedBusinesses;
  }, [eligibleBusinesses, eligibleSelectedBusinesses, targetMode]);

  const sendableCount = templateTargetBusinesses.length;

  const handleSendTemplate = async () => {
    try {
      setIsSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const targetBusinesses = mergeUniqueBusinessesById(templateTargetBusinesses);

      const businessIds = targetBusinesses
        .map((business) => getBusinessId(business))
        .filter(
          (businessId): businessId is string | number =>
            businessId !== undefined && businessId !== null
        );

      if (businessIds.length === 0) {
        setErrorMessage(
          targetMode === "selected_only"
            ? "Template göndermek için uygun durumda seçili firma bulunamadı."
            : "Bu arama içinde template gönderimine uygun firma bulunamadı."
        );
        return;
      }

      const previewNames = targetBusinesses
        .slice(0, 5)
        .map((business) => business.name)
        .filter(Boolean)
        .join(", ");

      const targetText =
        targetMode === "all_eligible"
          ? "tüm uygun firmaya"
          : "seçili uygun firmaya";

      const confirmed = window.confirm(
        `${businessIds.length} ${targetText} "${templateName}" template mesajı gönderilecek.\n\n` +
          "Daha önce template gönderilmiş, cevap bekleyen, cevap veren, ilgilenmiyor durumunda olan veya final sonucu belirlenmiş firmalar otomatik atlanır.\n\n" +
          "Devam etmek istiyor musunuz?" +
          (previewNames ? `\n\nİlk firmalar: ${previewNames}` : "")
      );

      if (!confirmed) {
        return;
      }

      const response = await sendWhatsAppTemplate({
        businessIds,
        templateName,
        languageCode: TEMPLATE_LANGUAGE_CODE,
      });

      const skippedCount =
        "skippedCount" in response ? Number(response.skippedCount || 0) : 0;

      setSuccessMessage(
        `Template gönderimi tamamlandı. Başarılı: ${response.sentCount}, Atlanan: ${skippedCount}, Başarısız: ${response.failedCount}.`
      );
    } catch (error) {
      console.error("WhatsApp template send error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp template gönderilemedi."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTestTemplate = async () => {
    if (!to.trim()) {
      setErrorMessage("Lütfen test template göndermek için alıcı numara girin.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await sendWhatsAppTestMessage({
        to: to.trim(),
        message: manualTemplateName,
        mode: "template",
        templateName: manualTemplateName,
        languageCode: TEMPLATE_LANGUAGE_CODE,
      });

      const normalizedTo = response.result?.to || to.trim();
      const messageStatus = response.result?.messageStatus;

      if (messageStatus === "accepted") {
        setSuccessMessage(
          `Template test isteği Meta tarafından kabul edildi (${normalizedTo}). Bu, mesajın henüz WhatsApp'a teslim edildiği anlamına gelmez.`
        );
        return;
      }

      setSuccessMessage(`Template test mesajı gönderildi (${normalizedTo}).`);
    } catch (error) {
      console.error("WhatsApp template test error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp template test mesajı gönderilemedi."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendButtonTestTemplate = async () => {
    try {
      setIsSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await sendWhatsAppTestMessage({
        to: BUTTON_WEBHOOK_TEST_PHONE,
        message: templateName,
        mode: "template",
        templateName,
        languageCode: TEMPLATE_LANGUAGE_CODE,
      });

      const normalizedTo =
        response.result?.to || BUTTON_WEBHOOK_TEST_PHONE;

      setSuccessMessage(
        `Buton webhook testi için template ${normalizedTo} numarasına gönderildi. Telefondan "Bilgi almak istiyorum" butonuna basıp backend log'larını izleyin.`
      );
    } catch (error) {
      console.error("WhatsApp button-test template send error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Buton webhook test template'i gönderilemedi."
      );
    } finally {
      setIsSending(false);
    }
  };

const handleSendMessage = async () => {
  if (!message.trim()) {
    setErrorMessage("Lütfen mesaj içeriğini doldurun.");
    setSuccessMessage("");
    return;
  }

  if (manualMessageBusinesses.length === 0) {
    setErrorMessage(
      "Manuel mesaj göndermek için listeden WhatsApp durumu 'Bilgi isteniyor' veya 'Daha sonra aranacak' olan bir firma seçin."
    );
    setSuccessMessage("");
    return;
  }

  if (manualMessageBusinesses.length > 1) {
    setErrorMessage(
      "Manuel mesaj göndermek için lütfen sadece bir firma seçin."
    );
    setSuccessMessage("");
    return;
  }

  const businessId = getBusinessId(manualTargetBusiness);

  if (!businessId) {
    setErrorMessage("Seçili firmanın businessId bilgisi bulunamadı.");
    setSuccessMessage("");
    return;
  }

  try {
    setIsSending(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await sendWhatsAppMessage({
      businessId,
      message: message.trim(),
    });

    const businessName =
      response.business?.name || manualTargetBusiness.name || "Seçili firma";

    setSuccessMessage(
      `Manuel mesaj gönderim isteği Meta tarafına iletildi: ${businessName}.`
    );
  } catch (error) {
    console.error("WhatsApp text send error:", error);

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "WhatsApp manuel mesajı gönderilemedi."
    );
  } finally {
    setIsSending(false);
  }
};

  return (
    <Card className="rounded-3xl bg-white">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-slate-800">
            WhatsApp Business
          </CardTitle>

          <p className="mt-1 text-sm text-slate-500">
            Template ve manuel mesaj gönderimlerini yönetin.
          </p>
        </div>

        <Badge className="shrink-0 rounded-full bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-50">
          Yeni Manuel Akış
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <section className="space-y-3 rounded-2xl bg-slate-50/60 p-4">
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
              1
            </span>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Template Seçimi
              </h3>

              <p className="text-xs text-slate-400">
                İlk mesaj Meta onaylı template ile gönderilir.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">
              Template Seçimi
            </label>

            <select
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="jefedes_kuafor">
                Jefedes Kuaför (jefedes_kuafor)
              </option>
              <option value="otel">Otel (otel)</option>
              <option value="restoran_kafe">
                Restoran &amp; Kafe (restoran_kafe)
              </option>
              <option value="dugun_davet">
                Düğün &amp; Davet (dugun_davet)
              </option>
              <option value="spor">Spor (spor)</option>
              <option value="saglik">Sağlık (saglik)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">
              Kime Gönderilecek?
            </p>

            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="template-target-mode"
                  checked={targetMode === "all_eligible"}
                  onChange={() => setTargetMode("all_eligible")}
                  className="h-4 w-4 accent-emerald-500"
                />
                Tüm uygun firmalara
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="template-target-mode"
                  checked={targetMode === "selected_only"}
                  onChange={() => setTargetMode("selected_only")}
                  className="h-4 w-4 accent-emerald-500"
                />
                Sadece seçili firmalara
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-700">
            {targetMode === "all_eligible"
              ? `Bu arama içinde ${eligibleBusinesses.length} uygun firmaya template gönderilebilir.`
              : `Seçili ${selectedPhoneCount} firmadan ${eligibleSelectedBusinesses.length} tanesi template için uygun.`}
            <br />
            Daha önce template gönderilen veya final sonucu belirlenen firmalar
            otomatik atlanır.
          </div>

          {targetMode === "selected_only" && (
            <Button
              type="button"
              variant="outline"
              onClick={onClearSelections}
              disabled={selectedPhoneCount === 0}
              className="h-10 w-full rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Seçimleri Temizle
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSendTemplate}
            disabled={isSending || sendableCount === 0}
            className="h-10 w-full rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-100 hover:bg-emerald-600 disabled:bg-emerald-300"
          >
            {isSending
              ? "Gönderiliyor..."
              : targetMode === "all_eligible"
              ? "Tüm Uygunlara Gönder"
              : "Seçilenlere Gönder"}
          </Button>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-4">
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
              2
            </span>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Manuel Mesaj
              </h3>

              <p className="text-xs text-slate-400">
                Cevap veren firmalara 24 saatlik pencere içinde mesaj gönderilir.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">
              Alıcı Numara
            </label>

            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="905313439734"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />

            <p className="text-xs text-slate-400">
              Numarayı ülke koduyla girin. Örnek: 905313439734
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">
              Template Seçimi (Test Template Gönder için)
            </label>

            <select
              value={manualTemplateName}
              onChange={(event) => setManualTemplateName(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="jefedes_kuafor">
                Jefedes Kuaför (jefedes_kuafor)
              </option>
              <option value="otel">Otel (otel)</option>
              <option value="restoran_kafe">
                Restoran &amp; Kafe (restoran_kafe)
              </option>
              <option value="dugun_davet">
                Düğün &amp; Davet (dugun_davet)
              </option>
              <option value="spor">Spor (spor)</option>
              <option value="saglik">Sağlık (saglik)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">
              Mesaj İçeriği
            </label>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Mesajınızı buraya yazın..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />

            <div className="flex justify-end text-xs text-slate-400">
              {message.length}/1000
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[0.8fr_1fr]">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendTestTemplate}
              disabled={isSending}
              className="h-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Test Template Gönder
            </Button>

            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={isSending}
              className="h-10 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-100 hover:bg-emerald-600 disabled:bg-emerald-300"
            >
              {isSending ? "Gönderiliyor..." : "Mesaj Gönder"}
            </Button>
          </div>
        </section>

        {successMessage && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
          İlk temas için template mesajı kullanılır. Firma cevap verdikten sonra
          manuel mesaj alanından serbest text gönderilebilir.
        </p>

        <section className="space-y-3 rounded-2xl bg-amber-50/60 p-4">
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
              ⚡
            </span>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Buton Webhook Testi
              </h3>

              <p className="text-xs text-slate-500">
                <span className="font-mono">{BUTTON_WEBHOOK_TEST_PHONE}</span>{" "}
                numarasına yukarıda seçili{" "}
                <span className="font-mono">{templateName}</span> template&apos;i
                gönderir. Telefondan butona basıp backend log&apos;larında button
                reply payload&apos;unu doğrulamak için.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSendButtonTestTemplate}
            disabled={isSending}
            className="h-10 w-full rounded-xl bg-amber-500 text-white shadow-md shadow-amber-100 hover:bg-amber-600 disabled:bg-amber-300"
          >
            {isSending
              ? "Gönderiliyor..."
              : `Test Template Gönder (${BUTTON_WEBHOOK_TEST_PHONE})`}
          </Button>
        </section>
      </CardContent>
    </Card>
  );
}
