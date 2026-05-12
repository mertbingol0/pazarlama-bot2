require("dotenv").config();

const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

const templatePayload = {
  name: "jefedes_intro_v2",
  language: "tr",
  category: "MARKETING",
  components: [
    {
      type: "BODY",
      text:
        "Merhaba, Jefedes ekibi olarak işletmenizin dijital görünürlüğünü artırmaya yönelik çözümlerimiz hakkında bilgi paylaşmak isteriz. Detaylı bilgi almak ister misiniz?",
    },
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "QUICK_REPLY",
          text: "Bilgi almak istiyorum",
        },
        {
          type: "QUICK_REPLY",
          text: "Daha sonra dönüş yapın",
        },
        {
          type: "QUICK_REPLY",
          text: "İlgilenmiyorum",
        },
      ],
    },
  ],
};

async function createTemplate() {
  if (!WHATSAPP_BUSINESS_ACCOUNT_ID || !WHATSAPP_TOKEN) {
    console.error("Eksik .env değeri:", {
      hasBusinessAccountId: Boolean(WHATSAPP_BUSINESS_ACCOUNT_ID),
      hasToken: Boolean(WHATSAPP_TOKEN),
    });
    process.exit(1);
  }

  const url = `https://graph.facebook.com/v20.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(templatePayload),
  });

  const data = await response.json();

  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(data.error?.message || "Template oluşturulamadı.");
  }

  console.log("Template oluşturma isteği Meta'ya gönderildi.");
}

createTemplate().catch((error) => {
  console.error("Hata:", error.message);
  process.exit(1);
});