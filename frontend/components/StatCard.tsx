import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: number;
};

export function StatCard({ title, value }: StatCardProps) {
  return (
    <Card className="rounded-2xl bg-white">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}