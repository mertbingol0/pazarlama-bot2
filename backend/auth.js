// JWT tabanlı kimlik doğrulama yardımcıları + Express middleware'leri.
require("dotenv").config();

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (
  process.env.NODE_ENV === "production" &&
  JWT_SECRET === "dev-insecure-secret-change-me"
) {
  console.warn(
    "[auth] UYARI: JWT_SECRET ayarlanmamış. Production için .env içine güçlü bir JWT_SECRET ekleyin."
  );
}

// Kullanıcı için imzalı JWT üretir. Payload minimum tutulur (id, username, role, team).
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      team: user.team || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Bearer" && token) return token;
  return null;
}

// Geçerli JWT zorunlu kılar; req.user'ı doldurur.
function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Yetkilendirme gerekli." });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      team: payload.team || null,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Geçersiz veya süresi dolmuş oturum.",
    });
  }
}

// requireAuth + role === 'admin' zorunluluğu.
function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu işlem için admin yetkisi gerekli.",
      });
    }
    return next();
  });
}

module.exports = {
  signToken,
  verifyToken,
  getTokenFromHeader,
  requireAuth,
  requireAdmin,
  JWT_EXPIRES_IN,
};
