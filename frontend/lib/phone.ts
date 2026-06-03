export type PhoneKind = "whatsapp" | "landline";

/**
 * Türkiye telefon numaralarını WhatsApp ile iletişim kurulabilen cep
 * hatları ("whatsapp") ile sabit hatlar ("landline") olarak ayrıştırır.
 *
 * Cep hatları ulusal formatta 5 ile başlar (5XX XXX XX XX). Sabit hatlar
 * coğrafi alan kodlarıyla başlar (0212, 0312, 0232 ...) yani ulusal formatta
 * 2/3/4 ile; 0850, 0800 gibi özel numaralar da WhatsApp dışıdır.
 */
export function classifyPhoneType(rawValue?: string | null): PhoneKind {
  const digits = (rawValue || "").replace(/\D/g, "");

  if (!digits) {
    return "landline";
  }

  let national = digits;

  // Ülke kodunu (90) ve baştaki 0'ı temizle.
  if (national.startsWith("90") && national.length > 10) {
    national = national.slice(2);
  }

  if (national.startsWith("0")) {
    national = national.slice(1);
  }

  // Türk cep hatları ulusal formatta 5 ile başlar ve WhatsApp'a uygundur.
  return national.startsWith("5") ? "whatsapp" : "landline";
}
