import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ListColumnProps = {
  title: string;
  items: {
    value: string;
    businessName: string;
    source: string;
    url?: string;
  }[];
  type: "phone" | "email" | "instagram";
};

export function ListColumn({ title, items, type }: ListColumnProps) {
  const getHref = (value: string, url?: string) => {
    if (type === "phone") {
      return `https://wa.me/${value.replace(/\D/g, "")}`;
    }

    if (type === "email") {
      return `mailto:${value}`;
    }

    return url || `https://instagram.com/${value.replace("@", "")}`;
  };

  const getActionText = () => {
    if (type === "phone") return "WhatsApp";
    if (type === "email") return "Mail Gönder";
    return "Profili Aç";
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert("Kopyalandı");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="secondary">{items.length}</Badge>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Sonuç bulunamadı.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.businessName}-${item.value}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="break-all font-medium text-slate-900">
                  {item.value}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {item.businessName}
                </p>

                <Badge variant="outline" className="mt-2">
                  {item.source}
                </Badge>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(item.value)}
                  >
                    Kopyala
                  </Button>

                  <Button size="sm" asChild>
                    <a
                      href={getHref(item.value, item.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {getActionText()}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}