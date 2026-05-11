"use client";

import { useState } from "react";
import { sendWhatsAppTestMessage } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEST_PHONE_NUMBER = "905313439734";

type SendTarget = "all_phone" | "approved";

export function WhatsAppBusinessPanel() {
  const [to, setTo] = useState(TEST_PHONE_NUMBER);
  const [templateName, setTemplateName] = useState("jefedes_intro_template");
  const [sendTarget, setSendTarget] = useState<SendTarget>("all_phone");

  const [message, setMessage] = useState(
    "Merhaba, işletmenizle iletişime geçmek istiyoruz."
  );

  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSendTemplate = async () => {
    setErrorMessage("");
    setSuccessMessage(
      `Template gönderimi hazırlandı. Seçilen template: ${templateName}. Hedef: ${
        sendTarget === "all_phone"
          ? "Tüm telefonlu firmalar"
          : "Sadece onaylananlar"
      }.`
    );
  };

  const handleSendMessage = async () => {
    if (!to.trim() || !message.trim()) {
      setErrorMessage("Lütfen alıcı numara ve mesaj içeriğini doldurun.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await sendWhatsAppTestMessage({
        to: to.trim(),
        message: message.trim(),
        mode: "text",
      });

      const normalizedTo = response.result?.to || to.trim();
      const messageStatus = response.result?.messageStatus;

      if (messageStatus === "accepted") {
        setSuccessMessage(
          `İstek Meta tarafından kabul edildi (${normalizedTo}). Bu, mesajın henüz WhatsApp'a teslim edildiği anlamına gelmez.`
        );
        return;
      }

      setSuccessMessage(`Mesaj isteği işlendi (${normalizedTo}).`);
    } catch (error) {
      console.error("WhatsApp send error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp mesajı gönderilemedi."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
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
        <section className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
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
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="jefedes_intro_template">
                Jefedes Tanıtım Template&apos;i
              </option>
              <option value="jefedes_info_template">
                Bilgi Talebi Template&apos;i
              </option>
              <option value="jefedes_followup_template">
                Takip Mesajı Template&apos;i
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">
              Kime Gönderilecek?
            </p>

            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="send-target"
                  checked={sendTarget === "all_phone"}
                  onChange={() => setSendTarget("all_phone")}
                  className="h-4 w-4 accent-emerald-500"
                />
                Tüm telefonlu firmalar
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="send-target"
                  checked={sendTarget === "approved"}
                  onChange={() => setSendTarget("approved")}
                  className="h-4 w-4 accent-emerald-500"
                />
                Sadece onaylananlar
              </label>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSendTemplate}
            className="h-10 w-full rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-100 hover:bg-emerald-600"
          >
            Template Gönder
          </Button>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4">
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
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />

            <p className="text-xs text-slate-400">
              Numarayı ülke koduyla girin. Örnek: 905313439734
            </p>
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
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />

            <div className="flex justify-end text-xs text-slate-400">
              {message.length}/1000
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[0.8fr_1fr]">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Dosya Ekle
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
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="whitespace-pre-line rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
          İlk temas için template mesajı kullanılır. Firma cevap verdikten sonra
          manuel mesaj alanından serbest text gönderilebilir.
        </p>
      </CardContent>
    </Card>
  );
}