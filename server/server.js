// server/server.js
import express from 'express';
const app = express();

app.use(express.json());

// Ruta de ejemplo
app.get("/", (req, res) => {
  res.send("Servidor funcionando!");
});

// Inicia el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});