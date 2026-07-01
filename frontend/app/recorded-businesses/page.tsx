import { ContactedBusinessesView } from "@/components/ContactedBusinessesView";

export default function RecordedBusinessesPage() {
  return (
    <ContactedBusinessesView
      mode="recorded"
      title="Kayıt Alınan İşletmeler"
      description="Görüşme sonucu 'Kayıt Alındı' olarak işaretlenen tüm işletmeler burada listelenir."
    />
  );
}
