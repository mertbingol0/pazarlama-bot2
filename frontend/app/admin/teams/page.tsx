"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";

import { loadAuth } from "@/lib/auth-storage";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type TeamItem,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function TeamRow({
  team,
  onRenamed,
  onDeleted,
}: {
  team: TeamItem;
  onRenamed: (t: TeamItem) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(team.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const value = label.trim();
    if (!value || value === team.label) {
      setEditing(false);
      setLabel(team.label);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateTeam(team.id, value);
      onRenamed(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncellenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`"${team.label}" birimini silmek istiyor musunuz?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteTeam(team.id);
      onDeleted(team.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 flex-1 rounded-lg bg-white"
              autoFocus
            />
            <Button
              type="button"
              onClick={save}
              disabled={busy}
              className="h-8 rounded-lg bg-emerald-500 px-2 text-white hover:bg-emerald-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setLabel(team.label);
                setError(null);
              }}
              className="h-8 rounded-lg px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {team.label}
              </p>
              <p className="truncate text-[11px] text-slate-400">{team.code}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Düzenle"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              title="Sil"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

export default function TeamsAdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
  }, [router]);

  const refresh = async () => {
    try {
      setTeams(await getTeams());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Birimler getirilemedi.");
    }
  };

  useEffect(() => {
    if (isAdmin) void refresh();
  }, [isAdmin]);

  const handleCreate = async () => {
    const value = newLabel.trim();
    if (!value) return;
    setCreating(true);
    setCreateError(null);
    try {
      const team = await createTeam(value);
      setTeams((prev) =>
        [...prev, team].sort((a, b) => a.label.localeCompare(b.label, "tr"))
      );
      setNewLabel("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-[#f7fbf9] px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Birim Yönetimi
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Birim oluşturun, adını düzenleyin veya silin. Birimler personel
              atamasında kullanılır.
            </p>
          </div>
          <Link
            href="/"
            aria-label="Ana sayfaya git"
            className="flex flex-col items-end leading-none"
          >
            <span className="text-2xl font-semibold tracking-tight text-slate-700">
              Jefedes<span className="text-emerald-500">.</span>
            </span>
          </Link>
        </header>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Yeni Birim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                }}
                placeholder="Birim adı (örn. Muhasebe)"
                className="h-9 flex-1 rounded-xl"
              />
              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newLabel.trim()}
                className="h-9 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {creating ? "Ekleniyor..." : "Ekle"}
              </Button>
            </div>
            {createError && (
              <p className="mt-2 text-xs text-red-600">{createError}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Birimler ({teams.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-slate-500">Henüz birim yok.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {teams.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    onRenamed={(t) =>
                      setTeams((prev) =>
                        prev
                          .map((x) => (x.id === t.id ? t : x))
                          .sort((a, b) => a.label.localeCompare(b.label, "tr"))
                      )
                    }
                    onDeleted={(id) =>
                      setTeams((prev) => prev.filter((x) => x.id !== id))
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
