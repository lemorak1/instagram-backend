import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());

const APP_ID = process.env.FB_APP_ID as string;
const APP_SECRET = process.env.FB_APP_SECRET as string;
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID as string;
const TOKEN_STORAGE_PATH = "/tmp/token.json"; // Ruta segura para guardar el token en Vercel

// **🔹 Función para leer el token desde /tmp/token.json**
function getStoredAccessToken(): string {
  if (fs.existsSync(TOKEN_STORAGE_PATH)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_STORAGE_PATH, "utf8"));
    return data.accessToken;
  }
  return process.env.FB_LONG_LIVED_ACCESS_TOKEN as string; // Si no existe, usa el de las variables de entorno
}

// **🔹 Verificar si el token necesita renovación**
function shouldRefreshToken(): boolean {
  if (!fs.existsSync(TOKEN_STORAGE_PATH)) return true; // Si el archivo no existe, renovar

  const data = JSON.parse(fs.readFileSync(TOKEN_STORAGE_PATH, "utf8"));
  const lastRefreshDate = new Date(data.lastRefresh);
  const currentDate = new Date();

  const diffInDays = Math.floor((currentDate.getTime() - lastRefreshDate.getTime()) / (1000 * 60 * 60 * 24));

  return diffInDays >= 55; // Renovar solo si han pasado 55 días o más
}

// **🔹 Función para renovar el token automáticamente**
async function refreshAccessToken(): Promise<void> {
  try {
    if (!shouldRefreshToken()) {
      console.log("⏳ No es necesario renovar el token todavía.");
      return;
    }

    const ACCESS_TOKEN = getStoredAccessToken();
    if (!ACCESS_TOKEN) throw new Error("❌ Token de acceso no encontrado en almacenamiento temporal.");

    const url = `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${ACCESS_TOKEN}`;
    const response = await axios.get(url);
    const newAccessToken: string = response.data.access_token;

    console.log("🔄 Nuevo Token Renovado:", newAccessToken);

    // **Guardar el token en almacenamiento temporal**
    fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify({ accessToken: newAccessToken, lastRefresh: new Date().toISOString() }));

    console.log("✅ Token guardado en almacenamiento temporal.");
  } catch (error) {
    console.error("❌ Error al renovar el token:", error instanceof Error ? error.message : "Error desconocido");
  }
}

// **🔹 API que devuelve imágenes de Instagram al frontend (SIN EXPONER EL TOKEN)**
app.get("/api/instagram-posts", async (req: Request, res: Response) => {
  try {
    const ACCESS_TOKEN = getStoredAccessToken();
    if (!ACCESS_TOKEN) throw new Error("❌ Token de acceso no disponible");

    const url = `https://graph.instagram.com/${INSTAGRAM_ACCOUNT_ID}/media?fields=id,caption,media_type,media_url,permalink&access_token=${ACCESS_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "❌ Error obteniendo imágenes de Instagram", details: error instanceof Error ? error.message : "Error desconocido" });
  }
});

// **🔄 Ejecutar la renovación del token automáticamente cada 24 horas, pero solo si es necesario**
setInterval(refreshAccessToken, 24 * 60 * 60 * 1000);

// **🚀 Iniciar el Servidor**
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  await refreshAccessToken(); // Al iniciar, revisamos si hay que renovar el token
});
