import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN as string;
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID as string;
const TOKEN_STORAGE_PATH = "/tmp/token.json"; // Ruta segura en Vercel

// **🔹 Leer el token desde .env o desde /tmp/token.json**
function getStoredAccessToken(): string | null {
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
  return INSTAGRAM_ACCESS_TOKEN; // Si no hay token en /tmp, usa el de .env
}

// **🔹 API que devuelve imágenes de Instagram al frontend (SIN EXPONER EL TOKEN)**
app.get("/api/instagram-posts", async (req: Request, res: Response) => {
  try {
    let ACCESS_TOKEN = getStoredAccessToken();

    if (!ACCESS_TOKEN) {
      throw new Error("❌ No se encontró un token de Instagram válido.");
    }

    console.log(`📸 Solicitando imágenes de Instagram con token: ${ACCESS_TOKEN}`);

    const response = await axios.get(`https://graph.instagram.com/${INSTAGRAM_ACCOUNT_ID}/media`, {
      params: {
        fields: "id,caption,media_type,media_url,permalink",
        access_token: INSTAGRAM_ACCESS_TOKEN,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("❌ Error en la solicitud a la API de Instagram:", error);
    res.status(500).json({
      error: "❌ Error obteniendo imágenes de Instagram",
      details: error,
    });
  }
});

// **🚀 Iniciar el Servidor**
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
