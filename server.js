const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// --- MongoDB Setup ---
mongoose.connect("mongodb://127.0.0.1:27017/collab-doc")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

const docSchema = new mongoose.Schema({
  documentName: String,
  content: String
});
const Document = mongoose.model("Document", docSchema);

// --- Socket.IO Setup ---
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join-document", async ({ documentName }) => {
    if (!documentName) return;

    documentName = String(documentName); // Ensure string
    socket.join(documentName);
    socket.data.documentName = documentName;

    // Load or create doc
    let doc = await Document.findOne({ documentName });
    if (!doc) doc = await Document.create({ documentName, content: "" });
    socket.emit("load-document", doc.content);

    // Sync changes to all clients
    socket.on("send-changes", async (data) => {
      await Document.updateOne({ documentName }, { content: data });
      socket.to(documentName).emit("receive-changes", data);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Disconnected from ${documentName}: ${socket.id}`);
    });
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));