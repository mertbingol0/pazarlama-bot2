import { StoredLeadsPage } from "@/components/StoredLeadsPage";

export default function ApprovedPage() {
  return (
    <StoredLeadsPage
      status="approved"
      title="Onaylanan Firmalar"
      description="Ana sayfada onaylanan olarak işaretlenen tüm firmalar burada listelenir."
    />
  );
}