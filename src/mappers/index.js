import express from "express";

import mapAnilistToAnimePahe from "./mappers/animepahe-mapper.js";
import mapAnilistToHiAnime from "./mappers/hianime-mapper.js";
import mapAnilistToAnimeKai from "./mappers/animekai-mapper.js";

const app = express();

app.use(express.json());

// Root check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Anime Mapper API running"
  });
});

// AnimePahe route
app.get("/animepahe/:id", async (req, res) => {
  try {
    const data = await mapAnilistToAnimePahe(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HiAnime route
app.get("/hianime/:id", async (req, res) => {
  try {
    const data = await mapAnilistToHiAnime(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AnimeKai route
app.get("/animekai/:id", async (req, res) => {
  try {
    const data = await mapAnilistToAnimeKai(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
