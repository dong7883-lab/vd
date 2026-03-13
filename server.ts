import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ytdl from "@distube/ytdl-core";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/youtube", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }

      res.setHeader("Content-Type", "audio/webm");
      res.setHeader("Content-Disposition", 'attachment; filename="youtube-audio.webm"');
      
      const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
      stream.pipe(res);
      
      stream.on('error', (err) => {
        console.error('YouTube DL Error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to fetch audio stream" });
        }
      });
    } catch (error: any) {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
