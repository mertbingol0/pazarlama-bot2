import { Card, CardContent } from "@/components/ui/card";

type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <Card className="mt-6 bg-red-50">
      <CardContent className="p-6">
        <p className="font-semibold text-red-900">Bir hata oluştu</p>

        <p className="mt-2 text-sm text-red-700">{message}</p>
      </CardContent>
    </Card>
  );
}