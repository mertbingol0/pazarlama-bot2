const { searchBusinessesWithGoogle } = require("./services/googlePlacesService");
const {
  enrichBusinessesWithContacts,
} = require("./services/websiteScraperService");
const {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateTest,
  sendWhatsAppTemplateMessage,
} = require("./services/whatsappService");
const {
  initDatabase,
  getCachedSearchResults,
  saveSearchResults,
  getSearchHistory,
  getSearchDetailsById,
  updateBusinessStatus,
  getBusinessesByStatus,

  getBusinessById,
  getBusinessesByWhatsAppStatus,
  updateBusinessWhatsAppStatus,
  markTemplateSent,
  markIncomingWhatsAppReply,

  logWhatsAppMessage,
  getWhatsAppConversations,
  getWhatsAppMessagesForPhone,
  markWhatsAppConversationRead,
  getWhatsAppContactInfo,
  upsertLiveSupportOutcome,

  saveLiveSupportLead,
  getLiveSupportLeads,
  getReportData,
  updateLiveSupportLeadNote,
  updateLiveSupportLead,
  clearLiveSupportLeads,
  getLiveSupportUnseenCount,
  markLiveSupportLeadsAsSeen,
  upsertManualMessageTestBusiness,

  authenticateUser,
} = require("./db");

const crypto = require("crypto");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: [
  "http://localhost:4002",
  "http://127.0.0.1:4002",
  "http://192.168.1.121:4002",
  "http://187.124.184.222:4002",
  "http://lf.jefedes.com",
  "https://lf.jefedes.com",
  "http://lf-api.jefedes.com",
  "https://lf-api.jefedes.com",
],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

function isValidWhatsAppStatus(status) {
  return [
    "not_sent",
    "template_sent",
    "waiting_reply",
    "replied",
    "follow_up",
    "not_interested",
  ].includes(status);
}
function isValidStatus(status) {
  return ["approved", "pending", "rejected"].includes(status);
}

function normalizeDemoSearchValue(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

function shouldInjectManualMessageTestBusiness({
  category,
  city,
  district,
}) {
  const normalizedCategory = normalizeDemoSearchValue(category);
  const normalizedCity = normalizeDemoSearchValue(city);
  const normalizedDistrict = normalizeDemoSearchValue(district);

  return (
    process.env.NODE_ENV !== "production" &&
    ["kuafor", "guzellik"].includes(normalizedCategory) &&
    normalizedCity === "istanbul" &&
    normalizedDistrict === "kadikoy"
  );
}

app.get("/api/searches", async (req, res) => {
  try {
    const searches = await getSearchHistory();

    return res.status(200).json({
      success: true,
      message: "Kayıtlı aramalar başarıyla getirildi.",
      searches,
    });
  } catch (error) {
    console.error("/api/searches hata:", error);

    return res.status(500).json({
      success: false,
      message: "Kayıtlı aramalar getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.get("/api/searches/:id", async (req, res) => {
  try {
    const searchId = Number(req.params.id);

    if (!Number.isInteger(searchId) || searchId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir arama ID değeri gönderilmelidir.",
      });
    }

    const details = await getSearchDetailsById(searchId);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: "Arama kaydı bulunamadı.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Arama detayı başarıyla getirildi.",
      search: details.search,
      businesses: details.businesses,
    });
  } catch (error) {
    console.error("/api/searches/:id hata:", error);

    return res.status(500).json({
      success: false,
      message: "Arama detayı getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.patch("/api/businesses/:id/status", async (req, res) => {
  try {
    const businessId = Number(req.params.id);
    const status = String(req.body.status || "")
      .trim()
      .toLowerCase();

    if (!Number.isInteger(businessId) || businessId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir işletme ID değeri gönderilmelidir.",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status alanı zorunludur.",
      });
    }

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status sadece approved, pending veya rejected olabilir.",
      });
    }

    const updatedBusiness = await updateBusinessStatus(businessId, status);

    if (!updatedBusiness) {
      return res.status(404).json({
        success: false,
        message: "İşletme bulunamadı.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "İşletme durumu başarıyla güncellendi.",
      business: updatedBusiness,
    });
  } catch (error) {
    console.error("/api/businesses/:id/status hata:", error);

    return res.status(500).json({
      success: false,
      message: "İşletme durumu güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.get("/api/businesses/status/:status", async (req, res) => {
  try {
    const status = String(req.params.status || "")
      .trim()
      .toLowerCase();

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status sadece approved, pending veya rejected olabilir.",
      });
    }

    const businesses = await getBusinessesByStatus(status);

    return res.status(200).json({
      success: true,
      message: `${status} durumundaki işletmeler başarıyla getirildi.`,
      status,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    console.error("/api/businesses/status/:status hata:", error);

    return res.status(500).json({
      success: false,
      message: "Duruma göre işletmeler getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});
app.get("/api/businesses", async (req, res) => {
  try {
    const whatsappStatus = String(req.query.whatsappStatus || "all")
      .trim()
      .toLowerCase();

    if (whatsappStatus !== "all" && !isValidWhatsAppStatus(whatsappStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "whatsappStatus sadece all, not_sent, template_sent, waiting_reply, replied, follow_up veya not_interested olabilir.",
      });
    }

    const businesses = await getBusinessesByWhatsAppStatus(whatsappStatus);

    return res.status(200).json({
      success: true,
      message: "İşletmeler başarıyla getirildi.",
      whatsappStatus,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    console.error("/api/businesses hata:", error);

    return res.status(500).json({
      success: false,
      message: "İşletmeler getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.get("/api/live-support-leads/unseen-count", async (req, res) => {
  try {
    const count = await getLiveSupportUnseenCount();

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("/api/live-support-leads/unseen-count hata:", error);

    return res.status(500).json({
      success: false,
      message: "Canlı destek bildirim sayısı alınırken hata oluştu.",
      error: error.message,
    });
  }
});

// WhatsApp gelen kutusu (inbox) — sohbet listesi
app.get("/api/whatsapp/conversations", async (req, res) => {
  try {
    const conversations = await getWhatsAppConversations();

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("/api/whatsapp/conversations hata:", error);
    return res.status(500).json({
      success: false,
      message: "Sohbetler getirilemedi.",
      error: error.message,
    });
  }
});

// Bir numaranın tüm mesaj geçmişi (+ açılınca okundu işaretle)
app.get("/api/whatsapp/conversations/:phone", async (req, res) => {
  try {
    const phone = String(req.params.phone || "");

    const data = await getWhatsAppMessagesForPhone(phone);
    const contact = await getWhatsAppContactInfo(phone);
    await markWhatsAppConversationRead(phone);

    return res.status(200).json({
      success: true,
      phone,
      ...data,
      business: contact.business,
      lead: contact.lead,
    });
  } catch (error) {
    console.error("/api/whatsapp/conversations/:phone hata:", error);
    return res.status(500).json({
      success: false,
      message: "Konuşma getirilemedi.",
      error: error.message,
    });
  }
});

// Gelen kutusundan serbest metin mesaj gönder
app.post("/api/whatsapp/conversations/:phone/send", async (req, res) => {
  try {
    const phone = String(req.params.phone || "");
    const message = String(req.body.message || "").trim();

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Telefon ve mesaj zorunludur.",
      });
    }

    const whatsappResult = await sendWhatsAppTextMessage({ to: phone, message });

    await logWhatsAppMessage({
      phone,
      direction: "outgoing",
      type: "text",
      text: message,
      messageId: whatsappResult.messageId,
    });

    return res.status(200).json({
      success: true,
      message: "Mesaj gönderildi.",
      result: whatsappResult,
    });
  } catch (error) {
    console.error("/api/whatsapp/conversations/:phone/send hata:", error);

    // 24 saat penceresi kapalıysa Meta serbest metni reddeder; mesajını ilet.
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Mesaj gönderilemedi. (24 saat penceresi kapalıysa template gerekir.)",
    });
  }
});

// WhatsApp sohbetinden sonuç/görüşme planı belirle → canlı desteğe işle
app.post("/api/whatsapp/conversations/:phone/outcome", async (req, res) => {
  try {
    const phone = String(req.params.phone || "");
    const result = String(req.body.result || "pending");
    const meetingAt = req.body.meetingAt ? String(req.body.meetingAt) : null;

    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Telefon zorunludur." });
    }

    const contact = await upsertLiveSupportOutcome({ phone, result, meetingAt });

    return res.status(200).json({
      success: true,
      message: "Sonuç kaydedildi ve canlı desteğe işlendi.",
      ...contact,
    });
  } catch (error) {
    console.error("/api/whatsapp/conversations/:phone/outcome hata:", error);
    return res.status(500).json({
      success: false,
      message: "Sonuç kaydedilemedi.",
      error: error.message,
    });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = String(req.query.from || defaultFrom.toISOString().slice(0, 10));
    const to = String(req.query.to || today);

    const report = await getReportData({ from, to });

    return res.status(200).json({
      success: true,
      message: "Rapor başarıyla oluşturuldu.",
      ...report,
    });
  } catch (error) {
    console.error("/api/reports hata:", error);

    return res.status(500).json({
      success: false,
      message: "Rapor oluşturulurken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.get("/api/live-support-leads", async (req, res) => {
  try {
    const leads = await getLiveSupportLeads();

    return res.status(200).json({
      success: true,
      message: "Canlı destek talepleri başarıyla getirildi.",
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error("/api/live-support-leads hata:", error);

    return res.status(500).json({
      success: false,
      message: "Canlı destek talepleri getirilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.delete("/api/live-support-leads", async (req, res) => {
  try {
    const result = await clearLiveSupportLeads();

    return res.status(200).json({
      success: true,
      message: "Canlı destek kayıtları başarıyla temizlendi.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE /api/live-support-leads hata:", error);

    return res.status(500).json({
      success: false,
      message: "Canlı destek kayıtları temizlenirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.patch("/api/live-support-leads/mark-seen", async (req, res) => {
  try {
    const result = await markLiveSupportLeadsAsSeen();

    return res.status(200).json({
      success: true,
      message: "Canlı destek bildirimleri görüldü olarak işaretlendi.",
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    console.error("/api/live-support-leads/mark-seen hata:", error);

    return res.status(500).json({
      success: false,
      message: "Canlı destek bildirimleri güncellenirken hata oluştu.",
      error: error.message,
    });
  }
});

app.patch("/api/live-support-leads/:id", async (req, res) => {
  try {
    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir canlı destek lead ID değeri gönderilmelidir.",
      });
    }

    const fields = {};

    if (req.body.note !== undefined) fields.note = String(req.body.note || "");
    if (req.body.result !== undefined)
      fields.result = String(req.body.result || "pending");
    if (req.body.meetingAt !== undefined)
      fields.meetingAt = req.body.meetingAt
        ? String(req.body.meetingAt)
        : null;
    if (req.body.assignedTo !== undefined)
      fields.assignedTo = req.body.assignedTo
        ? String(req.body.assignedTo)
        : null;

    const updatedLead = await updateLiveSupportLead(leadId, fields);

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Canlı destek kaydı bulunamadı ya da güncellenecek alan yok.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Canlı destek kaydı güncellendi.",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("/api/live-support-leads/:id hata:", error);

    return res.status(500).json({
      success: false,
      message: "Canlı destek kaydı güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.patch("/api/live-support-leads/:id/note", async (req, res) => {
  try {
    const leadId = Number(req.params.id);
    const note = String(req.body.note || "").trim();

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir canlı destek lead ID değeri gönderilmelidir.",
      });
    }

    const updatedLead = await updateLiveSupportLeadNote(leadId, note);

    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        message: "Canlı destek kaydı bulunamadı.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Not başarıyla güncellendi.",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("/api/live-support-leads/:id/note hata:", error);

    return res.status(500).json({
      success: false,
      message: "Canlı destek notu güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.patch("/api/businesses/:id/whatsapp-status", async (req, res) => {
  try {
    const businessId = Number(req.params.id);
    const requestedWhatsAppStatus = String(req.body.whatsappStatus || "")
      .trim()
      .toLowerCase();
    const whatsappStatus =
      requestedWhatsAppStatus === "waiting_reply"
        ? "template_sent"
        : requestedWhatsAppStatus;

    if (!Number.isInteger(businessId) || businessId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir işletme ID değeri gönderilmelidir.",
      });
    }

    if (!requestedWhatsAppStatus) {
      return res.status(400).json({
        success: false,
        message: "whatsappStatus alanı zorunludur.",
      });
    }

    if (!isValidWhatsAppStatus(whatsappStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "whatsappStatus sadece not_sent, template_sent, waiting_reply, replied, follow_up veya not_interested olabilir.",
      });
    }

    const business = await getBusinessById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Isletme bulunamadi.",
      });
    }

    const currentWhatsAppStatus = business.whatsappStatus || "not_sent";
    const hasTemplateBeenSent = Boolean(business.templateSentAt);

    if (
      currentWhatsAppStatus === "not_interested" &&
      whatsappStatus !== "not_interested"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Bu isletme not_interested durumunda oldugu icin baska bir aktif WhatsApp durumuna alinamaz.",
        currentStatus: currentWhatsAppStatus,
        templateSentAt: business.templateSentAt || null,
      });
    }

    if (
      whatsappStatus === "not_sent" &&
      (hasTemplateBeenSent || currentWhatsAppStatus !== "not_sent")
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Bu isletme tekrar not_sent durumuna alinamaz. Template daha once gonderilmis veya WhatsApp akisi baslatilmis.",
        currentStatus: currentWhatsAppStatus,
        templateSentAt: business.templateSentAt || null,
      });
    }

    const updatedBusiness = await updateBusinessWhatsAppStatus(
      businessId,
      whatsappStatus
    );

    if (!updatedBusiness) {
      return res.status(404).json({
        success: false,
        message: "İşletme bulunamadı.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "WhatsApp durumu başarıyla güncellendi.",
      business: updatedBusiness,
    });
  } catch (error) {
    console.error("/api/businesses/:id/whatsapp-status hata:", error);

    return res.status(500).json({
      success: false,
      message: "WhatsApp durumu güncellenirken bir hata oluştu.",
      error: error.message,
    });
  }
});
function getWhatsAppTemplateSkipReason(business) {
  const whatsappStatus = business.whatsappStatus || "not_sent";
  const leadStatus = business.status || "pending";

  const hasFinalLeadOutcome =
    leadStatus === "approved" || leadStatus === "rejected";

  if (hasFinalLeadOutcome) {
    return "final_lead_outcome";
  }

  if (whatsappStatus === "not_interested") {
    return "not_interested";
  }

  if (business.templateSentAt) {
    return "template_already_sent";
  }

  if (whatsappStatus !== "not_sent") {
    return "whatsapp_status_not_eligible";
  }

  return null;
}

function canSendWhatsAppTemplate(business) {
  return getWhatsAppTemplateSkipReason(business) === null;
}
app.post("/api/whatsapp/send-template", async (req, res) => {
  try {
    const {
      businessIds = [],
      templateName: rawTemplateName = "jefedes_merhaba",
      languageCode: rawLanguageCode = "tr",
    } = req.body;
    const templateName =
      String(rawTemplateName || "").trim() || "jefedes_merhaba";
    const languageCode = String(rawLanguageCode || "").trim() || "tr";

    if (!Array.isArray(businessIds) || businessIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "En az bir businessIds değeri gönderilmelidir.",
      });
    }

    const results = [];

    for (const rawBusinessId of businessIds) {
      const businessId = Number(rawBusinessId);

      if (!Number.isInteger(businessId) || businessId <= 0) {
        results.push({
          businessId: rawBusinessId,
          success: false,
          skipped: true,
          message: "Geçersiz işletme ID.",
        });
        continue;
      }

      const business = await getBusinessById(businessId);

      if (!business) {
        results.push({
          businessId,
          success: false,
          skipped: true,
          message: "İşletme bulunamadı.",
        });
        continue;
      }

      if (!business.phone) {
        results.push({
          businessId,
          success: false,
          skipped: true,
          message: "İşletmenin telefon numarası yok.",
        });
        continue;
      }

      if (!canSendWhatsAppTemplate(business)) {
        results.push({
          businessId,
          success: false,
          skipped: true,
          currentStatus: business.whatsappStatus || "not_sent",
          currentLeadStatus: business.status || "pending",
          templateSentAt: business.templateSentAt || null,
          skipReason: getWhatsAppTemplateSkipReason(business),
          message:
            "Bu firma template gonderimine uygun degil. currentStatus, currentLeadStatus, templateSentAt ve skipReason alanlarini kontrol edin.",
        });
        continue;
      }

      try {
        const whatsappResult = await sendWhatsAppTemplateMessage({
          to: business.phone,
          templateName,
          languageCode,
        });

      const updatedBusiness = await markTemplateSent({
        businessId,
        whatsappStatus: "template_sent",
        messageId: whatsappResult.messageId,
      });

      await logWhatsAppMessage({
        phone: business.phone,
        businessId,
        direction: "outgoing",
        type: "template",
        text: `Template gönderildi: ${templateName}`,
        messageId: whatsappResult.messageId,
      });

        results.push({
          businessId,
          success: true,
          skipped: false,
          message: "Template gönderim isteği Meta tarafına iletildi.",
          whatsapp: whatsappResult,
          business: updatedBusiness,
        });
      } catch (error) {
        results.push({
          businessId,
          success: false,
          skipped: false,
          message: error.message || "Template gönderilemedi.",
        });
      }
    }

    const sentCount = results.filter((item) => item.success).length;
    const skippedCount = results.filter((item) => item.skipped).length;
    const failedCount = results.filter(
      (item) => !item.success && !item.skipped
    ).length;

    return res.status(200).json({
      success: true,
      message: "Template gönderim işlemi tamamlandı.",
      sentCount,
      skippedCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("/api/whatsapp/send-template hata:", error);

    return res.status(500).json({
      success: false,
      message: "WhatsApp template gönderilirken bir hata oluştu.",
      error: error.message,
    });
  }
});

app.post("/api/whatsapp/send-message", async (req, res) => {
  try {
    const businessId = Number(req.body.businessId);
    const message = String(req.body.message || "").trim();

    if (!Number.isInteger(businessId) || businessId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir businessId gönderilmelidir.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Mesaj içeriği zorunludur.",
      });
    }

    const business = await getBusinessById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "İşletme bulunamadı.",
      });
    }

    if (!business.phone) {
      return res.status(400).json({
        success: false,
        message: "İşletmenin telefon numarası yok.",
      });
    }
if (business.whatsappStatus === "not_interested") {
  return res.status(400).json({
    success: false,
    message:
      "Bu işletme ilgilenmiyor durumunda olduğu için manuel mesaj gönderilemez.",
  });
}

if (!["replied", "follow_up"].includes(business.whatsappStatus)) {
  return res.status(400).json({
    success: false,
    message:
      "Bu işletmeye manuel mesaj göndermek için önce müşterinin cevap vermiş veya daha sonra aranacak durumunda olması gerekir. İlk temas için template gönderin.",
  });
}

    const whatsappResult = await sendWhatsAppTextMessage({
      to: business.phone,
      message,
    });

    await logWhatsAppMessage({
      phone: business.phone,
      businessId,
      direction: "outgoing",
      type: "text",
      text: message,
      messageId: whatsappResult.messageId,
    });

    const updatedBusiness = await updateBusinessWhatsAppStatus(
      businessId,
      "replied"
    );

    return res.status(200).json({
      success: true,
      message: "WhatsApp manuel mesaj gönderim isteği Meta tarafına iletildi.",
      result: whatsappResult,
      business: updatedBusiness,
    });
  } catch (error) {
    console.error("/api/whatsapp/send-message hata:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "WhatsApp manuel mesaj gönderilemedi.",
    });
  }
});

app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp webhook doğrulandı.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    console.log("WhatsApp webhook geldi:");
    console.log(JSON.stringify(req.body, null, 2));
    const body = req.body;

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const messageId = message.id;

    let messageText = "";

    if (message.type === "text") {
      messageText = message.text?.body || "";
    }

    if (message.type === "button") {
      messageText = message.button?.text || "";
    }

    if (message.type === "interactive") {
      messageText =
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        "";
    }


    

    const updatedBusiness = await markIncomingWhatsAppReply({
      phone: from,
      messageText,
      messageId,
    });

    const normalizedIncomingText = String(messageText || "")
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (
      normalizedIncomingText === "bilgi almak istiyorum" ||
      normalizedIncomingText.includes("bilgi almak istiyorum")
    ) {
      const liveSupportLead = await saveLiveSupportLead({
        phone: from,
        buttonText: messageText || "Bilgi almak istiyorum",
        messageId,
      });

      console.log("Canlı destek lead kaydedildi:", {
        phone: from,
        liveSupportLeadId: liveSupportLead?.id || null,
      });
    }

    console.log("WhatsApp gelen mesaj:", {
      from,
      messageText,
      updatedBusinessId: updatedBusiness?.id || null,
    });





    return res.sendStatus(200);
  } catch (error) {
    console.error("/api/whatsapp/webhook POST hata:", error);

    return res.sendStatus(200);
  }
});
app.post("/api/search", async (req, res) => {
  const {
    category,
    city = "",
    district = "",
    limit = 10,
  } = req.body;

  const normalizedCategory = String(category || "").trim();
  const normalizedCity = String(city || "").trim();
  const normalizedDistrict = String(district || "").trim();

  console.log("Yeni arama isteği geldi:");
  console.log("Kategori:", normalizedCategory || "Seçilmedi");
  console.log("İl:", normalizedCity || "Seçilmedi");
  console.log("İlçe:", normalizedDistrict || "Seçilmedi");
  console.log("Limit:", limit);
  console.log("Aktif provider: google");

  if (!normalizedCategory) {
    return res.status(400).json({
      success: false,
      message: "Kategori bilgisi zorunludur.",
    });
  }

  const searchQuery = [
    normalizedCategory,
    normalizedDistrict,
    normalizedCity,
    "Türkiye",
  ]
    .filter((value) => value && String(value).trim())
    .join(" ");

  try {
    let businesses = [];
    let fromCache = false;

    try {
      const googleResult = await searchBusinessesWithGoogle({
        category: normalizedCategory,
        city: normalizedCity,
        district: normalizedDistrict,
        limit,
      });

      const googleBusinesses = googleResult.businesses || [];

      // Website'i olan işletmeleri e-posta + sosyal medya verisiyle zenginleştir.
      try {
        await enrichBusinessesWithContacts(googleBusinesses, {
          concurrency: 10,
          timeoutMs: 6000,
        });
        console.log("İşletme website'leri iletişim verisi için tarandı.");
      } catch (scrapeError) {
        console.warn(
          "Website kazıma sırasında genel hata (sonuçlar yine de döner):",
          scrapeError.message
        );
      }

      await saveSearchResults({
        category: normalizedCategory,
        city: normalizedCity,
        district: normalizedDistrict,
        businesses: googleBusinesses,
      });

      const savedResults = await getCachedSearchResults({
        category: normalizedCategory,
        city: normalizedCity,
        district: normalizedDistrict,
      });

      businesses = savedResults?.businesses || googleBusinesses;

      console.log("Güncel sonuçlar Google Places API'den çekildi.");
      console.log("Sonuçlar SQLite'a kaydedildi.");
    } catch (googleError) {
      console.error(
        "Google Places hata verdi, kayıtlı sonuç kontrol ediliyor:",
        googleError
      );

      const cached = await getCachedSearchResults({
        category: normalizedCategory,
        city: normalizedCity,
        district: normalizedDistrict,
      });

      if (!cached) {
        throw googleError;
      }

      businesses = cached.businesses;
      fromCache = true;

      console.log(
        "Google Places hata verdiği için sonuçlar SQLite yedeğinden getirildi."
      );
    }

    if (
      shouldInjectManualMessageTestBusiness({
        category: normalizedCategory,
        city: normalizedCity,
        district: normalizedDistrict,
      })
    ) {
      try {
        const testBusiness = await upsertManualMessageTestBusiness({
          category: normalizedCategory,
          city: normalizedCity,
          district: normalizedDistrict,
          phone: "905300448478",
        });

        if (testBusiness) {
          businesses = [
            testBusiness,
            ...businesses.filter(
              (business) => String(business.id) !== String(testBusiness.id)
            ),
          ];
        }
      } catch (manualTestBusinessError) {
        console.warn(
          "Manual message test business local arama sonucuna eklenemedi:",
          manualTestBusinessError
        );
      }
    }

    const phones = businesses
      .filter((business) => business.phone)
   .map((business) => ({
  id: business.id,
  businessId: business.id,
  value: business.phone,
  businessName: business.name,
  address: business.address,
  source: business.source || "google_places",
  url: business.googleMapsUrl,
  website: business.website,
  rating: business.rating,
  status: business.status || "pending",

  whatsappStatus: business.whatsappStatus || "not_sent",
  templateSentAt: business.templateSentAt || null,
  lastIncomingAt: business.lastIncomingAt || null,
  lastMessageText: business.lastMessageText || null,
  lastWhatsappMessageId: business.lastWhatsappMessageId || null,

  lat: business.lat || null,
  lng: business.lng || null,
}));

    const buildContactItem = (business, value, extra = {}) => ({
      // Bir işletmenin birden çok mail/sosyal linki olabilir; React anahtarı
      // ve durum yönetimi için id'yi değere göre benzersiz tut. İşletme
      // eşleşmesi businessId üzerinden yapılır.
      id: `${business.id}-${value}`,
      businessId: business.id,
      value,
      businessName: business.name,
      address: business.address,
      source: business.source || "google_places",
      url: business.googleMapsUrl,
      website: business.website,
      status: business.status || "pending",
      ...extra,
    });

    const emails = businesses
      .filter((business) => business.email)
      .flatMap((business) =>
        String(business.email)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => buildContactItem(business, value))
      );

    // Sosyal mecralar: instagram + scrape edilen diğer sosyal linkler.
    const instagrams = businesses
      .filter((business) => business.socials || business.instagram)
      .flatMap((business) => {
        const links = String(business.socials || business.instagram || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);

        const uniqueLinks = Array.from(new Set(links));

        return uniqueLinks.map((link) =>
          buildContactItem(business, link, { url: link })
        );
      });

    const totalBusinesses = businesses.length;
    const phonesFound = phones.length;
    const emailsFound = emails.length;
    const instagramsFound = instagrams.length;
    if (totalBusinesses === 0) {
  return res.status(200).json({
    success: true,
    provider: "google",
    message:
      "Google Places araması tamamlandı ancak bu kriterlerle işletme bulunamadı. Kategori, il, ilçe veya API bağlantısını kontrol edin.",
    fromCache,
    query: {
      category: normalizedCategory,
      city: normalizedCity,
      district: normalizedDistrict,
      limit,
      searchQuery,
    },
    stats: {
      totalBusinesses: 0,
      phonesFound: 0,
      emailsFound: 0,
      instagramsFound: 0,
    },
    results: {
      phones: [],
      emails: [],
      instagrams: [],
    },
    businesses: [],
  });
}

    return res.status(200).json({
      success: true,
      provider: "google",
      message: fromCache
        ? "Güncel veri alınamadığı için kayıtlı son sonuçlar gösteriliyor."
        : "Güncel Google Places arama sonuçları başarıyla getirildi.",
      fromCache,
      query: {
        category: normalizedCategory,
        city: normalizedCity,
        district: normalizedDistrict,
        limit,
        searchQuery,
      },
      stats: {
        totalBusinesses,
        phonesFound,
        emailsFound,
        instagramsFound,
      },
      results: {
        phones,
        emails,
        instagrams,
      },
      businesses,
    });
  } catch (error) {
    console.error("/api/search hata:", error);

    return res.status(500).json({
      success: false,
      message: "Arama sırasında bir hata oluştu.",
      error: error.message,
    });
  }
});

app.post("/api/whatsapp/send-test", async (req, res) => {
  try {
    const {
      to,
      message,
      mode = "text",
      templateName = "jefedes_merhaba",
      languageCode = "tr",
    } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Alıcı numara zorunludur.",
      });
    }

    let whatsappPayload;

    if (mode === "template") {
      const headerImageUrl =
        String(req.body.headerImageUrl || "").trim() ||
        process.env.WHATSAPP_TEMPLATE_HEADER_IMAGE_URL ||
        "";

      const template = {
        name: templateName,
        language: {
          code: languageCode,
        },
      };

      if (headerImageUrl) {
        template.components = [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: headerImageUrl,
                },
              },
            ],
          },
        ];
      }

      whatsappPayload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template,
      };
    } else {
      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Mesaj içeriği zorunludur.",
        });
      }

      whatsappPayload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          data.error?.message || "WhatsApp test mesajı gönderilemedi.",
        error: data.error,
      });
    }

    return res.json({
      success: true,
      message:
        mode === "template"
          ? "WhatsApp template test mesajı gönderildi."
          : "WhatsApp test mesajı gönderildi.",
      result: {
        requestAccepted: true,
        to,
        messageId: data.messages?.[0]?.id || null,
        messageStatus: data.messages?.[0]?.message_status,
        raw: data,
      },
    });
  } catch (error) {
    console.error("WhatsApp send-test error:", error);

    return res.status(500).json({
      success: false,
      message: "WhatsApp test mesajı gönderilirken sunucu hatası oluştu.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
app.get("/webhooks/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Webhook verify isteği geldi:", {
    mode,
    token,
    expectedToken: process.env.WHATSAPP_VERIFY_TOKEN,
  });

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("WhatsApp webhook doğrulandı.");
    return res.status(200).send(challenge);
  }

  console.warn("WhatsApp webhook doğrulama başarısız.");
  return res.sendStatus(403);
});

function extractWhatsAppMessages(body) {
  return (
    body?.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) => change.value?.messages || []) || []
    ) || []
  );
}

function getWhatsAppReplyText(message) {
  return (
    message?.button?.text ||
    message?.interactive?.button_reply?.title ||
    message?.interactive?.list_reply?.title ||
    message?.text?.body ||
    ""
  ).trim();
}

function normalizeReplyText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function getWhatsAppReplyAction(replyText) {
  const normalized = normalizeReplyText(replyText);

  if (!normalized) {
    return null;
  }

  if (normalized.includes("bilgi almak istiyorum")) {
    return {
      type: "info_requested",
      leadStatus: "pending",
      whatsappStatus: "replied",
      actionLabel: "Bilgi isteniyor",
    };
  }

  if (normalized.includes("daha sonra")) {
    return {
      type: "follow_up",
      leadStatus: "pending",
      whatsappStatus: "follow_up",
      actionLabel: "Daha sonra aranacak",
    };
  }

  if (normalized.includes("ilgilenmiyorum")) {
    return {
      type: "not_interested",
      leadStatus: "rejected",
      whatsappStatus: "not_interested",
      actionLabel: "Görüşme sonlandırıldı",
    };
  }

  return null;
}

app.post("/webhooks/whatsapp/webhook", async (req, res) => {
  try {
    console.log("WhatsApp webhook geldi:");
    console.log(JSON.stringify(req.body, null, 2));

    const messages = extractWhatsAppMessages(req.body);

    if (messages.length === 0) {
      console.log("Webhook geldi ama messages alanı boş.");
      return res.sendStatus(200);
    }

 for (const message of messages) {
  const fromPhone = message.from;
  const messageId = message.id;
  const replyText = getWhatsAppReplyText(message);
  const action = getWhatsAppReplyAction(replyText);

  console.log("WhatsApp cevap analizi:", {
    fromPhone,
    messageId,
    messageType: message.type,
    replyText,
    action,
  });

  // Gelen her mesajı konuşma geçmişine kaydet (tanımlı butona uymasa da).
  await logWhatsAppMessage({
    phone: fromPhone,
    direction: "incoming",
    type: message.type || "text",
    text: replyText,
    messageId,
  });

  if (!action) {
    console.log("Tanımlı olmayan WhatsApp cevabı:", replyText);
    continue;
  }

  const updatedBusiness = await markIncomingWhatsAppReply({
    phone: fromPhone,
    messageText: replyText,
    messageId,
  });

  if (!updatedBusiness) {
    console.warn("Telefon numarasına bağlı işletme bulunamadı:", {
      fromPhone,
      replyText,
    });
  }

  if (action.type === "info_requested") {
    if (updatedBusiness?.id) {
      await updateBusinessStatus(updatedBusiness.id, "pending");
      await updateBusinessWhatsAppStatus(updatedBusiness.id, "replied");
    }

    const liveSupportLead = await saveLiveSupportLead({
      phone: fromPhone,
      buttonText: replyText || "Bilgi almak istiyorum",
      status: "info_requested",
      messageId,
    });

    console.log("Firma bilgi almak istiyor. Canlı destek gerekli:", {
      phone: fromPhone,
      businessId: updatedBusiness?.id || null,
      liveSupportLeadId: liveSupportLead?.id || null,
    });
  }

  if (action.type === "follow_up") {
    if (updatedBusiness?.id) {
      await updateBusinessStatus(updatedBusiness.id, "pending");
      await updateBusinessWhatsAppStatus(updatedBusiness.id, "follow_up");
    }

    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 1);

    const liveSupportLead = await saveLiveSupportLead({
      phone: fromPhone,
      buttonText: replyText || "Daha sonra dönüş yapacağım",
      status: "follow_up",
      messageId,
    });

    console.log("Firma daha sonra dönüş istedi. Canlı desteğe eklendi:", {
      phone: fromPhone,
      businessId: updatedBusiness?.id || null,
      liveSupportLeadId: liveSupportLead?.id || null,
      followUpAt: followUpDate.toISOString(),
    });
  }

  if (action.type === "not_interested") {
    if (updatedBusiness?.id) {
      await updateBusinessStatus(updatedBusiness.id, "rejected");
      await updateBusinessWhatsAppStatus(updatedBusiness.id, "not_interested");
    }

    const liveSupportLead = await saveLiveSupportLead({
      phone: fromPhone,
      buttonText: replyText || "İlgilenmiyorum",
      status: "not_interested",
      messageId,
    });

    console.log("Firma ilgilenmiyor. Canlı desteğe eklendi:", {
      phone: fromPhone,
      businessId: updatedBusiness?.id || null,
      liveSupportLeadId: liveSupportLead?.id || null,
    });
  }
}

return res.sendStatus(200);
  } catch (error) {
    console.error("WhatsApp webhook işleme hatası:", error);
    return res.sendStatus(500);
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Kullanıcı adı ve şifre zorunludur.",
      });
    }

    const user = await authenticateUser({ username, password });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Kullanıcı adı veya şifre hatalı.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    return res.status(200).json({
      success: true,
      message: "Giriş başarılı.",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("/api/auth/login hata:", error);

    return res.status(500).json({
      success: false,
      message: "Giriş yapılırken bir hata oluştu.",
      error: error.message,
    });
  }
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend ${PORT} portunda çalışıyor.`);
    });
  })
  .catch((error) => {
    console.error("Database başlatılamadı:", error);
    process.exit(1);
  });
