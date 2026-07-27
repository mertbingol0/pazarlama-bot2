"use client";

import { useCallback, useState } from "react";
import { z } from "zod";

// "" veya "YYYY-MM-DD" kabul eder; boş değerler filtre yok anlamına gelir.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih");
const rangeField = z.union([z.literal(""), isoDate]);

export const dateRangeSchema = z
  .object({
    from: rangeField,
    to: rangeField,
  })
  .refine(
    (v) => !v.from || !v.to || v.from <= v.to,
    { message: "Başlangıç tarihi bitişten sonra olamaz", path: ["to"] },
  );

export type DateRangeForm = z.infer<typeof dateRangeSchema>;

const empty: DateRangeForm = { from: "", to: "" };

// Draft + applied ayrımı: kullanıcı takvimde tarih seçer (draft),
// "Uygula" ile applied değeri güncellenir ve fetch tetiklenir.
export function useDateRangeForm(initial: DateRangeForm = empty) {
  const [draft, setDraft] = useState<DateRangeForm>(initial);
  const [applied, setApplied] = useState<DateRangeForm>(initial);
  const [error, setError] = useState<string | null>(null);

  const isDirty = draft.from !== applied.from || draft.to !== applied.to;

  const apply = useCallback(() => {
    const parsed = dateRangeSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Geçersiz tarih aralığı");
      return false;
    }
    setError(null);
    setApplied(parsed.data);
    return true;
  }, [draft]);

  const reset = useCallback(() => {
    setDraft(empty);
    setApplied(empty);
    setError(null);
  }, []);

  return { draft, setDraft, applied, apply, reset, error, isDirty };
}
