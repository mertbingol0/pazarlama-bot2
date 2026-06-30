// Drizzle ORM şeması (PostgreSQL) — CRM.
//
// Tasarım notları:
// - Zaman damgaları saniye çözünürlüğünde (precision 0) ve "string" modunda tutulur;
//   böylece UTC "YYYY-MM-DD HH:MM:SS" formatı korunur ve frontend / msSince uyumlu kalır.
// - Statü/sonuç/kanal alanları DB'de text'tir; geçerli değerler dbConstants.js içinde
//   tanımlı ve uygulama katmanında (zod) doğrulanır. Yeni değer eklemek migration gerektirmez.
// - Veri ortak/paylaşımlıdır: searches & businesses tüm kullanıcılarca görülür (cache + havuz).
//   Erişim kısıtı uygulama katmanında (rol/birim) yapılır, satır seviyesinde değil.
const {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} = require("drizzle-orm/pg-core");
const { relations } = require("drizzle-orm");

const {
  USER_ROLES,
  TEAMS,
  BUSINESS_STATUSES,
  INTERACTION_CHANNELS,
  INTERACTION_OUTCOMES,
  MESSAGE_DIRECTIONS,
  MESSAGE_STATUSES,
  ACTIVITY_ACTIONS,
} = require("./dbConstants");

const ts = (name) =>
  timestamp(name, { mode: "string", precision: 0, withTimezone: false });

// ===========================================================================
// users — admin ve birim personelleri.
// ===========================================================================
// ===========================================================================
// teams — birimler (yönetilebilir). Kullanıcıların team alanı code'a referans verir.
// ===========================================================================
const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    label: text("label").notNull(),
    createdAt: ts("created_at").defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("idx_teams_code").on(table.code),
  })
);

const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    fullName: text("full_name"),
    // 'admin' | 'personnel' (bkz. dbConstants.USER_ROLES)
    role: text("role").notNull().default("personnel"),
    // Personelin birimi: saha_pazarlama | reklam_pazarlama | cagri_merkezi (admin'de null)
    team: text("team"),
    isActive: boolean("is_active").notNull().default(true),
    // Bu kullanıcıyı oluşturan admin (self-reference).
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").defaultNow(),
    updatedAt: ts("updated_at").defaultNow(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("idx_users_username").on(table.username),
    roleIdx: index("idx_users_role").on(table.role),
    teamIdx: index("idx_users_team").on(table.team),
  })
);

// ===========================================================================
// searches — sorgu önbelleği (lokalizasyon). Aynı kategori+il+ilçe ikinci kez
// sorulduğunda API yerine DB'den okunur. Tüm kullanıcılar için ortak.
// ===========================================================================
const searches = pgTable(
  "searches",
  {
    id: serial("id").primaryKey(),
    searchKey: text("search_key").notNull().unique(),
    category: text("category").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    // Sorguyu ilk tetikleyen kullanıcı (analitik için).
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resultCount: integer("result_count").default(0),
    // API'ye en son ne zaman gerçek sorgu atıldı (cache tazeleme kararları için).
    lastFetchedAt: ts("last_fetched_at"),
    createdAt: ts("created_at").defaultNow(),
    updatedAt: ts("updated_at").defaultNow(),
  },
  (table) => ({
    searchKeyIdx: uniqueIndex("idx_searches_search_key").on(table.searchKey),
  })
);

// ===========================================================================
// businesses — ortak işletme havuzu (sorgudan veya manuel eklenen).
// ===========================================================================
const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    searchId: integer("search_id").references(() => searches.id, {
      onDelete: "cascade",
    }),
    externalId: text("external_id"),
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    instagram: text("instagram"),
    socials: text("socials"),
    address: text("address"),
    website: text("website"),
    googleMapsUrl: text("google_maps_url"),
    rating: doublePrecision("rating"),
    userRatingCount: integer("user_rating_count").default(0),
    source: text("source").default("google_places"),
    // CRM süreç durumu (bkz. dbConstants.BUSINESS_STATUSES)
    status: text("status").default("pending"),
    category: text("category"),
    city: text("city"),
    district: text("district"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    // Bu işletmeyi takip eden / atanan personel.
    assignedTo: integer("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    // İşletmeyi sisteme ekleyen kullanıcı (özellikle manuel kayıtlarda).
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    addedManually: boolean("added_manually").notNull().default(false),
    // Denormalize WhatsApp özet alanları (hızlı listeleme için; ayrıntı interactions/messages'ta).
    whatsappStatus: text("whatsapp_status").default("not_sent"),
    templateSentAt: ts("template_sent_at"),
    lastIncomingAt: ts("last_incoming_at"),
    lastMessageText: text("last_message_text"),
    lastWhatsappMessageId: text("last_whatsapp_message_id"),
    createdAt: ts("created_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("idx_businesses_status").on(table.status),
    externalIdIdx: index("idx_businesses_external_id").on(table.externalId),
    whatsappStatusIdx: index("idx_businesses_whatsapp_status").on(
      table.whatsappStatus
    ),
    assignedToIdx: index("idx_businesses_assigned_to").on(table.assignedTo),
    searchIdIdx: index("idx_businesses_search_id").on(table.searchId),
  })
);

// ===========================================================================
// whatsapp_contacts — WhatsApp'ta sohbet edilen kişiler (kişi bilgisi depolanır).
// "+" ile aranabilir; son hangi birim/personelin iletişime geçtiği burada tutulur.
// ===========================================================================
const whatsappContacts = pgTable(
  "whatsapp_contacts",
  {
    id: serial("id").primaryKey(),
    // Normalize edilmiş (sadece rakam) telefon — tekil.
    phone: text("phone").notNull().unique(),
    name: text("name"),
    profileName: text("profile_name"),
    businessId: integer("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    lastMessageText: text("last_message_text"),
    lastMessageAt: ts("last_message_at"),
    lastIncomingAt: ts("last_incoming_at"),
    lastOutgoingAt: ts("last_outgoing_at"),
    // Bu sohbete en son hangi personel ve hangi birim dokundu (sohbet listesinde gösterilir).
    lastContactedBy: integer("last_contacted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    lastContactedTeam: text("last_contacted_team"),
    unreadCount: integer("unread_count").notNull().default(0),
    createdAt: ts("created_at").defaultNow(),
    updatedAt: ts("updated_at").defaultNow(),
  },
  (table) => ({
    phoneIdx: uniqueIndex("idx_whatsapp_contacts_phone").on(table.phone),
    businessIdIdx: index("idx_whatsapp_contacts_business_id").on(
      table.businessId
    ),
    lastMessageAtIdx: index("idx_whatsapp_contacts_last_message_at").on(
      table.lastMessageAt
    ),
  })
);

// ===========================================================================
// whatsapp_messages — tüm WhatsApp mesaj geçmişi (giden + gelen).
// ===========================================================================
const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: serial("id").primaryKey(),
    phone: text("phone").notNull(),
    contactId: integer("contact_id").references(() => whatsappContacts.id, {
      onDelete: "set null",
    }),
    businessId: integer("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    // Giden mesajı atan personel.
    senderUserId: integer("sender_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    direction: text("direction").notNull(), // incoming | outgoing
    type: text("type").default("text"),
    text: text("text").default(""),
    messageId: text("message_id"),
    status: text("status").default("sent"), // queued|sent|delivered|read|failed
    readAt: ts("read_at"),
    createdAt: ts("created_at").defaultNow(),
  },
  (table) => ({
    phoneIdx: index("idx_whatsapp_messages_phone").on(table.phone),
    contactIdIdx: index("idx_whatsapp_messages_contact_id").on(table.contactId),
    businessIdIdx: index("idx_whatsapp_messages_business_id").on(
      table.businessId
    ),
  })
);

// ===========================================================================
// interactions — görüşme kayıtları (WhatsApp sonucu, telefon araması, yüz yüze,
// manuel görüşme). CRM'in çekirdek aktivite kaydı: kanal, sonuç, not, personel,
// (gerekirse) ileri görüşme tarihi. Tüm kullanıcılarca listelenir.
// ===========================================================================
const interactions = pgTable(
  "interactions",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    contactId: integer("contact_id").references(() => whatsappContacts.id, {
      onDelete: "set null",
    }),
    // Görüşmeyi yapan personel + birim anlık görüntüsü (geçmiş doğruluğu için denormalize).
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    team: text("team"),
    channel: text("channel").notNull(), // whatsapp|call|face_to_face|manual|...
    outcome: text("outcome").default("pending"),
    note: text("note").default(""),
    // outcome = 'to_meet' (daha sonra görüşülecek) ise planlanan görüşme tarihi.
    meetingAt: ts("meeting_at"),
    // İşletmeye bağlı olmayan görüşmeler için serbest kişi bilgisi.
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    createdAt: ts("created_at").defaultNow(),
    updatedAt: ts("updated_at").defaultNow(),
  },
  (table) => ({
    businessIdIdx: index("idx_interactions_business_id").on(table.businessId),
    contactIdIdx: index("idx_interactions_contact_id").on(table.contactId),
    userIdIdx: index("idx_interactions_user_id").on(table.userId),
    teamIdx: index("idx_interactions_team").on(table.team),
    outcomeIdx: index("idx_interactions_outcome").on(table.outcome),
    meetingAtIdx: index("idx_interactions_meeting_at").on(table.meetingAt),
    createdAtIdx: index("idx_interactions_created_at").on(table.createdAt),
  })
);

// ===========================================================================
// business_notes — bir işletmeye eklenen serbest notlar (yazar + zaman).
// Tüm kullanıcılarca görülebilir. (Görüşmeye özel notlar interactions.note'ta.)
// ===========================================================================
const businessNotes = pgTable(
  "business_notes",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    team: text("team"),
    // Hangi birim sütununa ait: 'wp' | 'saha' | 'cagri' | 'admin'.
    category: text("category"),
    note: text("note").notNull(),
    createdAt: ts("created_at").defaultNow(),
  },
  (table) => ({
    businessIdIdx: index("idx_business_notes_business_id").on(table.businessId),
  })
);

// ===========================================================================
// activity_log — tüm anlamlı eylemlerin akışı. "Durum Takip" sayfası (aramalar,
// mesajlar, yüz yüze görüşmeler) + admin'in anlık izlemesi + analitik bu tablodan beslenir.
// ===========================================================================
const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    team: text("team"),
    action: text("action").notNull(), // bkz. dbConstants.ACTIVITY_ACTIONS
    entityType: text("entity_type"), // business | contact | interaction | search | user | message
    entityId: integer("entity_id"),
    description: text("description"),
    // Eyleme özel serbest ayrıntılar (ör. eski/yeni statü, sorgu parametreleri).
    metadata: jsonb("metadata"),
    createdAt: ts("created_at").defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_activity_log_user_id").on(table.userId),
    actionIdx: index("idx_activity_log_action").on(table.action),
    teamIdx: index("idx_activity_log_team").on(table.team),
    createdAtIdx: index("idx_activity_log_created_at").on(table.createdAt),
    entityIdx: index("idx_activity_log_entity").on(
      table.entityType,
      table.entityId
    ),
  })
);

// ===========================================================================
// live_support_leads — ESKİ (legacy). Mevcut Express app tarafından kullanılır.
// Yeni Fastify backend'inde yerini whatsapp_contacts + interactions alacak;
// geçiş tamamlanınca kaldırılacak. Şimdilik eski uygulamayı bozmamak için tutuluyor.
// ===========================================================================
const liveSupportLeads = pgTable(
  "live_support_leads",
  {
    id: serial("id").primaryKey(),
    phone: text("phone").notNull().unique(),
    buttonText: text("button_text").default("Bilgi almak istiyorum"),
    status: text("status").default("info_requested"),
    result: text("result").default("pending"),
    meetingAt: text("meeting_at"),
    assignedTo: text("assigned_to"),
    note: text("note").default(""),
    messageId: text("message_id"),
    seenAt: ts("seen_at"),
    createdAt: ts("created_at").defaultNow(),
    updatedAt: ts("updated_at").defaultNow(),
  },
  (table) => ({
    phoneIdx: index("idx_live_support_leads_phone").on(table.phone),
    statusIdx: index("idx_live_support_leads_status").on(table.status),
    updatedAtIdx: index("idx_live_support_leads_updated_at").on(table.updatedAt),
    seenAtIdx: index("idx_live_support_leads_seen_at").on(table.seenAt),
  })
);

// ===========================================================================
// Relations (Drizzle ilişkisel sorgu API'si için — migration'ı etkilemez).
// ===========================================================================
const usersRelations = relations(users, ({ one, many }) => ({
  creator: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "user_creator",
  }),
  assignedBusinesses: many(businesses),
  interactions: many(interactions),
  notes: many(businessNotes),
  activities: many(activityLog),
}));

const searchesRelations = relations(searches, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [searches.createdBy],
    references: [users.id],
  }),
  businesses: many(businesses),
}));

const businessesRelations = relations(businesses, ({ one, many }) => ({
  search: one(searches, {
    fields: [businesses.searchId],
    references: [searches.id],
  }),
  assignedUser: one(users, {
    fields: [businesses.assignedTo],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [businesses.createdBy],
    references: [users.id],
  }),
  contacts: many(whatsappContacts),
  interactions: many(interactions),
  notes: many(businessNotes),
  messages: many(whatsappMessages),
}));

const whatsappContactsRelations = relations(
  whatsappContacts,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [whatsappContacts.businessId],
      references: [businesses.id],
    }),
    lastContactedByUser: one(users, {
      fields: [whatsappContacts.lastContactedBy],
      references: [users.id],
    }),
    messages: many(whatsappMessages),
    interactions: many(interactions),
  })
);

const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  contact: one(whatsappContacts, {
    fields: [whatsappMessages.contactId],
    references: [whatsappContacts.id],
  }),
  business: one(businesses, {
    fields: [whatsappMessages.businessId],
    references: [businesses.id],
  }),
  sender: one(users, {
    fields: [whatsappMessages.senderUserId],
    references: [users.id],
  }),
}));

const interactionsRelations = relations(interactions, ({ one }) => ({
  business: one(businesses, {
    fields: [interactions.businessId],
    references: [businesses.id],
  }),
  contact: one(whatsappContacts, {
    fields: [interactions.contactId],
    references: [whatsappContacts.id],
  }),
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
}));

const businessNotesRelations = relations(businessNotes, ({ one }) => ({
  business: one(businesses, {
    fields: [businessNotes.businessId],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [businessNotes.userId],
    references: [users.id],
  }),
}));

const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

module.exports = {
  // tablolar
  teams,
  users,
  searches,
  businesses,
  whatsappContacts,
  whatsappMessages,
  interactions,
  businessNotes,
  activityLog,
  liveSupportLeads,
  // relations
  usersRelations,
  searchesRelations,
  businessesRelations,
  whatsappContactsRelations,
  whatsappMessagesRelations,
  interactionsRelations,
  businessNotesRelations,
  activityLogRelations,
};
