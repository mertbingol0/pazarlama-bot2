"use client";

import { useEffect, useState } from "react";

import { loadAuth } from "@/lib/auth-storage";
import {
  CHANNEL_OPTIONS,
  OUTCOME_OPTIONS,
  saveBusinessInteraction,
  addBusinessNote,
  updateBusinessNote,
  getBusinessNotes,
  type AssignableUser,
  type BusinessCrm,
  type BusinessNote,
  type InteractionChannel,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function userLabel(user: AssignableUser) {
  return user.fullName ? `${user.fullName} (${user.username})` : user.username;
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  // UTC "YYYY-MM-DD HH:MM:SS" -> yerel okunur biçim
  const date = new Date(String(value).replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  businessId: number | string;
  initial: BusinessCrm;
  assignableUsers: AssignableUser[];
  onUpdated?: (businessId: number | string, data: BusinessCrm) => void;
};

export function BusinessInteractionPanel({
  businessId,
  initial,
  assignableUsers,
  onUpdated,
}: Props) {
  const auth = loadAuth();
  const currentUserId = auth?.user?.id ?? null;
  const currentUserRole = auth?.user?.role ?? null;

  const [channel, setChannel] = useState<InteractionChannel | "">(
    (initial.interaction?.channel as InteractionChannel) || ""
  );
  const [outcome, setOutcome] = useState<string>(
    initial.interaction?.outcome && initial.interaction.outcome !== "pending"
      ? initial.interaction.outcome
      : ""
  );
  const [assignedUserId, setAssignedUserId] = useState<string>(
    String(initial.interaction?.userId ?? currentUserId ?? "")
  );
  const [notes, setNotes] = useState<BusinessNote[]>(initial.notes || []);
  const [newNote, setNewNote] = useState("");

  // Panel açılınca tüm kullanıcıların en güncel notlarını çek (başkaları sayfa
  // yüklendikten sonra not eklemiş olabilir).
  useEffect(() => {
    let active = true;
    getBusinessNotes(businessId)
      .then((fresh) => {
        if (active) setNotes(fresh);
      })
      .catch(() => {
        /* sessizce yoksay; mevcut (ön yüklenen) notlar kalır */
      });
    return () => {
      active = false;
    };
  }, [businessId]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Not düzenleme
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const canEditNote = (note: BusinessNote) =>
    currentUserRole === "admin" || note.userId === currentUserId;

  const startEdit = (note: BusinessNote) => {
    setEditingNoteId(note.id);
    setEditText(note.note);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  const handleSaveEdit = async (noteId: number) => {
    const text = editText.trim();
    if (!text) return;

    setSavingEdit(true);
    setError(null);
    try {
      const updated = await updateBusinessNote(businessId, noteId, text);
      const nextNotes = notes.map((n) => (n.id === noteId ? updated : n));
      setNotes(nextNotes);
      setEditingNoteId(null);
      setEditText("");
      onUpdated?.(businessId, { interaction: initial.interaction, notes: nextNotes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not düzenlenemedi.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Tek "Kaydet": girilen tüm bilgileri (kanal/sonuç/personel) ve varsa yeni notu
  // birlikte kaydeder.
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const interaction = await saveBusinessInteraction(businessId, {
        channel: channel || null,
        outcome: outcome || null,
        assignedUserId: Number(assignedUserId) || null,
      });

      let nextNotes = notes;
      const text = newNote.trim();
      if (text) {
        const note = await addBusinessNote(businessId, text);
        nextNotes = [note, ...notes];
        setNotes(nextNotes);
        setNewNote("");
      }

      setSavedAt(new Date().toLocaleTimeString("tr-TR"));
      onUpdated?.(businessId, { interaction, notes: nextNotes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50/60 px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Kanal */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            İletişim Kanalı
          </label>
          <Select
            value={channel}
            onValueChange={(value) => setChannel(value as InteractionChannel)}
          >
            <SelectTrigger className="h-9 rounded-xl bg-white">
              <SelectValue placeholder="Seçin (whatsapp/telefon/yüz yüze)" />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sonuç */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            Görüşme Sonucu
          </label>
          <Select value={outcome} onValueChange={(value) => setOutcome(value)}>
            <SelectTrigger className="h-9 rounded-xl bg-white">
              <SelectValue placeholder="Sonuç seçin" />
            </SelectTrigger>
            <SelectContent>
              {OUTCOME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* İletişime geçen personel */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            İletişime Geçen Personel
          </label>
          <Select
            value={assignedUserId}
            onValueChange={(value) => setAssignedUserId(value)}
          >
            <SelectTrigger className="h-9 rounded-xl bg-white">
              <SelectValue placeholder="Personel seçin" />
            </SelectTrigger>
            <SelectContent>
              {assignableUsers.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {userLabel(user)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Yeni not (Kaydet ile birlikte kaydedilir) */}
      <div className="mt-4">
        <label className="text-xs font-medium text-slate-600">Not Ekle</label>
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Bu işletme hakkında not ekleyin (opsiyonel)..."
          className="mt-1.5 min-h-[44px] rounded-xl bg-white"
          rows={2}
        />
      </div>

      {/* Tek Kaydet: kanal/sonuç/personel + (varsa) not */}
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-9 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
        {!saving && savedAt && (
          <span className="text-xs text-emerald-600">
            Kaydedildi · {savedAt}
          </span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {/* Mevcut notlar */}
      <div className="mt-4">
        {notes.length > 0 && (
          <>
          <label className="text-xs font-medium text-slate-600">
            Notlar ({notes.length})
          </label>
          <ul className="mt-1.5 flex flex-col gap-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl bg-white px-3 py-2"
              >
                {editingNoteId === note.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[44px] rounded-xl"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={savingEdit || !editText.trim()}
                        className="rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        {savingEdit ? "Kaydediliyor..." : "Kaydet"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        className="rounded-lg"
                      >
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {note.note}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400">
                        {note.userFullName || note.userUsername || "Bilinmeyen"}{" "}
                        · {formatDateTime(note.createdAt)}
                      </p>
                      {canEditNote(note) && (
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          className="text-[11px] font-medium text-emerald-600 hover:underline"
                        >
                          Düzenle
                        </button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          </>
        )}
      </div>
    </div>
  );
}
