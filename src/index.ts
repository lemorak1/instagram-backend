import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import instagramRouter from "../src/routes/instagram";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(express.json());

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error conectando a MongoDB:", err));
  // Rutas
  app.use("/webhooks", instagramRouter);
  app.get('/webhooks/instagram', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode && token && mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.status(403).send('Forbidden');
    }
});

// Inicia el servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
