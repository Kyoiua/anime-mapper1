import axios from 'axios';
import * as cheerio from 'cheerio';

export class AnimePahe {
  constructor() {
    this.baseUrl = 'https://animepahe.ru';
  }

  async scrapeSearchResults(query) {
    const { data } = await axios.get(`${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`);
    return data.data || [];
  }

  async scrapeEpisodes(session) {
    const { data } = await axios.get(`${this.baseUrl}/api?m=release&id=${session}&sort=episode_asc`);
    
    return {
      totalEpisodes: data.total || 0,
      episodes: (data.data || []).map(ep => ({
        episode: ep.episode,
        episodeId: ep.session,
        snapshot: ep.snapshot
      }))
    };
  }

  async fetchEpisodeSources(session) {
    // Step 1: get episode page
    const url = `${this.baseUrl}/play/${session}`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const links = [];

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('kwik')) {
        links.push(href);
      }
    });

    if (links.length === 0) {
      throw new Error('No stream links found');
    }

    // Step 2: extract from kwik
    const stream = await this.extractKwik(links[0]);

    return [
      {
        url: stream,
        isM3U8: true
      }
    ];
  }

  async extractKwik(url) {
    const { data } = await axios.get(url, {
      headers: {
        Referer: 'https://animepahe.ru/'
      }
    });

    const match = data.match(/source:\s*"(.*?)"/);

    if (!match) throw new Error('Stream not found');

    return match[1];
  }
}
