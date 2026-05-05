import { StoredLeadsPage } from "@/components/StoredLeadsPage";

export default function RejectedPage() {
  return (
    <StoredLeadsPage
      status="rejected"
      title="Reddedilen Firmalar"
      description="Ana sayfada reddedilen olarak işaretlenen tüm firmalar burada listelenir."
    />
  );
}