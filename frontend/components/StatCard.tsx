import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: number;
};

export function StatCard({ title, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}