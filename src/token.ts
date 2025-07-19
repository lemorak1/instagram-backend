import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

let accessToken: string = process.env.INSTAGRAM_ACCESS_TOKEN as string;

export const getAccessToken = () => accessToken;

export async function refreshAccessToken() {
  try {
    const response = await axios.get(
      "https://graph.instagram.com/refresh_access_token",
      {
        params: {
          grant_type: "ig_refresh_token",
          access_token: accessToken,
        },
      }
    );
    accessToken = response.data.access_token;
    console.log("🔄 Token de Instagram actualizado");
  } catch (error) {
    console.error("❌ Error actualizando el token:", error);
  }
}

const REFRESH_INTERVAL_MS = 25 * 60 * 1000; // 25 minutos

if (accessToken) {
  setInterval(refreshAccessToken, REFRESH_INTERVAL_MS);
}
