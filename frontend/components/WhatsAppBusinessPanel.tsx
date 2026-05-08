"use client";

import { useState } from "react";
import { sendWhatsAppTestMessage } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEST_PHONE_NUMBER = "905313439734";

export function WhatsAppBusinessPanel() {
  const [to, setTo] = useState(TEST_PHONE_NUMBER);
  const [message, setMessage] = useState(
    "Merhaba, işletmenizle iletişime geçmek istiyoruz."
  );
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

      await sendWhatsAppTestMessage({
        to: to.trim(),
        message: message.trim(),
      });

      setSuccessMessage("WhatsApp mesajı başarıyla gönderildi.");
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
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-slate-800">
            WhatsApp Business
          </CardTitle>

          <p className="mt-1 text-sm text-slate-500">
            Test numarasına mesaj gönderimi.
          </p>
        </div>

        <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
          Test
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Alıcı Numara
          </label>

          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="905313439734"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />

          <p className="text-xs text-slate-400">
            Test için numara Türkiye koduyla gönderilir: 905313439734
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Mesaj İçeriği
          </label>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            placeholder="Gönderilecek mesajı yaz..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {successMessage && (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          onClick={handleSendMessage}
          disabled={isSending}
          className="h-11 w-full rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-100 hover:bg-emerald-600 disabled:bg-emerald-300"
        >
          {isSending ? "Gönderiliyor..." : "Mesaj Gönder"}
        </Button>
      </CardContent>
    </Card>
  );
}