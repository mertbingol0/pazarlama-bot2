import { Card, CardContent } from "@/components/ui/card";

export function LoadingState() {
  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <p className="font-medium text-slate-900">İşletmeler aranıyor...</p>

        <p className="mt-1 text-sm text-slate-500">
          Gerçek sistemde scraping işlemi 30 saniye ile 2 dakika arasında
          sürebilir.
        </p>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-900" />
        </div>
      </CardContent>
    </Card>
  );
}