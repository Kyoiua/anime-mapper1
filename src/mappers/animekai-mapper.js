import axios from 'axios';

export class AnimePahe {
  constructor() {
    this.api = 'https://animepahe.ru/api';
    this.base = 'https://animepahe.ru';
  }

  // 🔍 Search anime
  async scrapeSearchResults(query) {
    const { data } = await axios.get(`${this.api}`, {
      params: {
        m: 'search',
        q: query
      }
    });

    return (data?.data || []).map(a => ({
      id: a.id,
      session: a.session,
      title: a.title,
      type: a.type,
      year: a.year,
      poster: a.poster
    }));
  }

  // 📺 Get episodes
  async scrapeEpisodes(session) {
    let page = 1;
    let allEpisodes = [];

    while (true) {
      const { data } = await axios.get(`${this.api}`, {
        params: {
          m: 'release',
          id: session,
          sort: 'episode_asc',
          page
        }
      });

      if (!data?.data || data.data.length === 0) break;

      const eps = data.data.map(ep => ({
        number: ep.episode,
        episodeId: ep.session,
        snapshot: ep.snapshot
      }));

      allEpisodes.push(...eps);

      if (page >= data.last_page) break;
      page++;
    }

    return {
      totalEpisodes: allEpisodes.length,
      episodes: allEpisodes
    };
  }

  // 🎬 Get streams
  async fetchEpisodeSources(episodeSession) {
    // Step 1: get download page (contains kwik links)
    const { data } = await axios.get(`${this.api}`, {
      params: {
        m: 'links',
        id: episodeSession
      }
    });

    if (!data?.data) {
      throw new Error('No links found');
    }

    // Find kwik link
    let kwikUrl = null;

    for (const lang of Object.values(data.data)) {
      for (const quality of Object.values(lang)) {
        if (quality?.kwik) {
          kwikUrl = quality.kwik;
          break;
        }
      }
      if (kwikUrl) break;
    }

    if (!kwikUrl) {
      throw new Error('No kwik link found');
    }

    // Step 2: extract stream from kwik
    const stream = await this.extractKwik(kwikUrl);

    return {
      success: true,
      sources: [
        {
          url: stream,
          isM3U8: true
        }
      ]
    };
  }

  // 🔓 Extract m3u8 from kwik
  async extractKwik(url) {
    const { data } = await axios.get(url, {
      headers: {
        Referer: 'https://animepahe.ru/'
      }
    });

    // Try multiple patterns (kwik changes often)
    let match =
      data.match(/source:\s*"(.*?)"/) ||
      data.match(/file:\s*"(.*?)"/) ||
      data.match(/sources:\s*\[\{file:\s*"(.*?)"/);

    if (!match) {
      throw new Error('Stream not found in kwik');
    }

    return match[1];
  }
}
