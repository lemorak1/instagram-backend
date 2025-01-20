import { Router } from "express";
import { Post } from "../models/Post";

const router = Router();

// Verificar Webhook
router.get("/instagram", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recibir eventos de Instagram
router.post("/instagram", async (req, res) => {
  const data = req.body;

  if (data.object === "instagram") {
    data.entry.forEach(async (entry: any) => {
      const changes = entry.changes || [];
      for (const change of changes) {
        console.log("Evento recibido:", change);

        // Guarda la publicación en la base de datos
        if (change.field === "feed") {
          const newPost = new Post({
            id: change.value.id,
            caption: change.value.caption,
            media_url: change.value.media_url,
            permalink: change.value.permalink,
            created_time: new Date(change.value.timestamp),
          });
          await newPost.save();
        }
      }
    });
  }

  res.status(200).send("Evento recibido");
});

export default router;
