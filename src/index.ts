//Generar nuevo token long life si el servidor se cae luego de 60 dias (por expiracionde token)
//TU_TOKEN_TEMPORAL lo puedes generar en la pagina api graph de fb
//https://developers.facebook.com/tools/explorer/?method=GET&path=me%2Faccounts%3Ffields%3Dinstagram_business_account%7Bid%2Cusername%7D&version=v22.0
//el resto lo tienes el .env ()
// GET "https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=TU_APP_ID&client_secret=TU_APP_SECRET&fb_exchange_token=TU_TOKEN_TEMPORAL"

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
const TOKEN_STORAGE_PATH = "/tmp/token.json"; // Ruta segura en Vercel

const apiClient = axios.create({
  baseURL: "https://graph.instagram.com", // API de Instagram correcta
});

// **🔹 Obtener el Token de Instagram desde el token de Facebook**
async function getInstagramAccessToken(facebookAccessToken: string): Promise<string> {
  try {
    const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${facebookAccessToken}`;
    const response = await axios.get(url);
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Error obteniendo el token de Instagram:", error);
    throw new Error("Error al obtener el token de Instagram.");
  }
}

// **🔹 Leer el token desde /tmp/token.json**
function getStoredAccessToken(): string {
  try {
    if (fs.existsSync(TOKEN_STORAGE_PATH)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_STORAGE_PATH, "utf8"));
      if (data.accessToken) {
        return data.accessToken;
      }
    }
  } catch (error) {
    console.error("❌ Error leyendo el token desde almacenamiento temporal:", error);
  }

  console.log("⚠️ Usando el token de las variables de entorno.");
  return process.env.FB_LONG_LIVED_ACCESS_TOKEN as string;
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

// **🔹 Renovar el token automáticamente**
async function refreshAccessToken(): Promise<void> {
  try {
    if (!shouldRefreshToken()) {
      console.log("⏳ No es necesario renovar el token todavía.");
      return;
    }

    const FACEBOOK_ACCESS_TOKEN = getStoredAccessToken();
    if (!FACEBOOK_ACCESS_TOKEN) throw new Error("❌ Token de Facebook no encontrado.");

    console.log("🔄 Obteniendo nuevo token de Instagram...");
    const INSTAGRAM_ACCESS_TOKEN = await getInstagramAccessToken(FACEBOOK_ACCESS_TOKEN);

    console.log("🔄 Nuevo Token de Instagram Renovado:", INSTAGRAM_ACCESS_TOKEN);

    // **Guardar el token de Instagram en almacenamiento temporal**
    fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify({ accessToken: INSTAGRAM_ACCESS_TOKEN, lastRefresh: new Date().toISOString() }));

    console.log("✅ Token de Instagram guardado en almacenamiento temporal.");
  } catch (error) {
    console.error("❌ Error al renovar el token:", error instanceof Error ? error.message : "Error desconocido");
  }
}

// **🔹 API que devuelve imágenes de Instagram al frontend (SIN EXPONER EL TOKEN)**
app.get("/api/instagram-posts", async (req: Request, res: Response) => {
  try {
    const ACCESS_TOKEN = getStoredAccessToken();
    if (!ACCESS_TOKEN) throw new Error("❌ Token de Instagram no disponible");

    const response = await apiClient.get(`/${INSTAGRAM_ACCOUNT_ID}/media`, {
      params: {
        fields: "id,caption,media_type,media_url,permalink",
        access_token: ACCESS_TOKEN,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("❌ Error en la solicitud a la API de Instagram:", error);

    if (axios.isAxiosError(error)) {
      res.status(500).json({
        error: "❌ Error obteniendo imágenes de Instagram",
        details: error.response?.data || error.message,
      });
    } else {
      res.status(500).json({
        error: "❌ Error desconocido en la API",
      });
    }
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
