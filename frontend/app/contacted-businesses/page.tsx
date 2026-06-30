import { ContactedBusinessesView } from "@/components/ContactedBusinessesView";

export default function ContactedBusinessesPage() {
  return (
    <ContactedBusinessesView
      mode="talked"
      title="Görüşülen İşletmeler"
      description="Bugün (son 24 saat) görüşülen işletmeler, görüşme sonucuna göre kategorilenmiş olarak listelenir. Kayıt alınanlar 'Kayıt Alınan İşletmeler' sayfasındadır."
    />
  );
}
