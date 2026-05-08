const GRAPH_API_VERSION = "v22.0";

async function sendWhatsAppTextMessage({ to, message }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error("WHATSAPP_TOKEN .env içinde tanımlı değil.");
  }

  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID .env içinde tanımlı değil.");
  }

  if (!to) {
    throw new Error("Mesaj gönderilecek telefon numarası eksik.");
  }
console.log("WhatsApp env kontrol:", {
  tokenVarMi: Boolean(token),
  tokenIlkKarakterler: token?.slice(0, 6),
  tokenUzunluk: token?.length,
  phoneNumberId,
  graphApiVersion: GRAPH_API_VERSION,
  aliciNumara: to,
});
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      }),
    }
  );

const data = await response.json();

if (!response.ok) {
  console.error("WhatsApp API error:", data);
  throw new Error(data.error?.message || "WhatsApp mesajı gönderilemedi.");
}

console.log("WhatsApp API success:", data);

return data;
}

module.exports = {
  sendWhatsAppTextMessage,
};