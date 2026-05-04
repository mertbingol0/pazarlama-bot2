import { Card, CardContent } from "@/components/ui/card";

export function EmptyState() {
  return (
    <Card className="mt-6">
      <CardContent className="p-8 text-center">
        <p className="text-lg font-semibold text-slate-900">
          Henüz arama yapılmadı
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Kategori, il ve ilçe seçerek potansiyel müşteri araması başlatın.
        </p>
      </CardContent>
    </Card>
  );
}