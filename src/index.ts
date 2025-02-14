import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN as string;
const INSTAGRAM_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID as string;

if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_ACCOUNT_ID) {
  console.error("❌ Error: Falta configurar INSTAGRAM_ACCESS_TOKEN o INSTAGRAM_ACCOUNT_ID en .env");
  process.exit(1);
}

// **🔹 API que devuelve imágenes de Instagram al frontend**
app.get("/api/instagram-posts", async (req: Request, res: Response) => {
  try {
    console.log(`📸 Solicitando imágenes de Instagram con token: ${INSTAGRAM_ACCESS_TOKEN}`);

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
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
