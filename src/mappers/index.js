import express from 'express';
import { mapAnilistToAnimePahe, mapAnilistToHiAnime, mapAnilistToAnimeKai } from './mappers/index.js';
import { AnimePahe } from './providers/animepahe.js';
import { AnimeKai } from './providers/animekai.js';
import { getEpisodeServers, getEpisodeSources } from './providers/hianime-servers.js';
import { cache } from './utils/cache.js';

const app = express();

app.use(express.json());

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Anilist Mapper API running'
  });
});

// ─────────────────────────────
// AnimePahe Mapping
// ─────────────────────────────
app.get('/animepahe/map/:anilistId', cache('5 minutes'), async (req, res) => {
  try {
    const data = await mapAnilistToAnimePahe(req.params.anilistId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────
// HiAnime Mapping
// ─────────────────────────────
app.get('/hianime/:anilistId', cache('5 minutes'), async (req, res) => {
  try {
    const data = await mapAnilistToHiAnime(req.params.anilistId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get HiAnime servers
app.get('/hianime/servers/:animeId', cache('15 minutes'), async (req, res) => {
  try {
    const { animeId } = req.params;
    const { ep } = req.query;

    const episodeId = ep ? `${animeId}?ep=${ep}` : animeId;

    const data = await getEpisodeServers(episodeId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get HiAnime sources
app.get('/hianime/sources/:animeId', cache('15 minutes'), async (req, res) => {
  try {
    const { animeId } = req.params;
    const { ep, server = 'vidstreaming', category = 'sub' } = req.query;

    if (!ep) {
      return res.status(400).json({ error: 'ep query required' });
    }

    const episodeId = `${animeId}?ep=${ep}`;
    const data = await getEpisodeSources(episodeId, server, category);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────
// AnimeKai
// ─────────────────────────────
app.get('/animekai/map/:anilistId', cache('5 minutes'), async (req, res) => {
  try {
    const data = await mapAnilistToAnimeKai(req.params.anilistId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/animekai/sources/:episodeId', cache('15 minutes'), async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { server, dub } = req.query;

    const api = new AnimeKai();
    const data = await api.fetchEpisodeSources(
      episodeId,
      server,
      dub === 'true'
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────
// AnimePahe Sources
// ─────────────────────────────
app.get('/animepahe/sources/:session/:episodeId', cache('15 minutes'), async (req, res) => {
  try {
    const { session, episodeId } = req.params;

    const api = new AnimePahe();
    const data = await api.fetchEpisodeSources(`${session}/${episodeId}`);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// fallback
app.get('/animepahe/sources/:id', cache('15 minutes'), async (req, res) => {
  try {
    const api = new AnimePahe();
    const data = await api.fetchEpisodeSources(req.params.id);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────
// HLS via AniList
// ─────────────────────────────
app.get('/animepahe/hls/:anilistId/:episode', cache('15 minutes'), async (req, res) => {
  try {
    const { anilistId, episode } = req.params;

    const map = await mapAnilistToAnimePahe(anilistId);
    const eps = map?.animepahe?.episodes || [];

    let target = eps.find(e => e.number === Number(episode));

    if (!target) {
      target = eps[Number(episode) - 1];
    }

    if (!target) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const api = new AnimePahe();
    const sources = await api.fetchEpisodeSources(target.episodeId);

    res.json({
      sources,
      image: target.image || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ REQUIRED FOR VERCEL
export default app;
