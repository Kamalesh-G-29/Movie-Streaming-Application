const express = require('express');
const router = express.Router();
const dns = require('dns');
try {
  dns.setDefaultResultOrder('verbatim');
} catch (e) {}

const getFetch = () => {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch;
  try {
    const mod = require('node-fetch');
    return typeof mod === 'function' ? mod : mod.default;
  } catch {
    return null;
  }
};

const { getYear, isBlocked } = require('../utils/helpers');
const { compareMovies } = require('../services/movieComparison');
const { getCinevoraComparison } = require('../services/geminiComparison');
const { getAudienceReception } = require('../services/audienceReception');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_API_KEY = 'c00a129541b13f723b08893d51be29ea';
const getApiKey = () => {
  return process.env.TMDB_API_KEY || DEFAULT_TMDB_API_KEY;
};

const FALLBACK_MOVIES = [
  {
    id: 157336,
    title: "Interstellar",
    vote_average: 8.4,
    vote_count: 36000,
    release_date: "2014-11-05",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
    genre_ids: [12, 18, 878],
    original_language: "en",
    runtime: 169,
    imdb_id: "tt0816692"
  },
  {
    id: 27205,
    title: "Inception",
    vote_average: 8.4,
    vote_count: 37000,
    release_date: "2010-07-15",
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\".",
    genre_ids: [28, 878, 12],
    original_language: "en",
    runtime: 148,
    imdb_id: "tt1375666"
  },
  {
    id: 872585,
    title: "Oppenheimer",
    vote_average: 8.1,
    vote_count: 9500,
    release_date: "2023-07-19",
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop_path: "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    genre_ids: [18, 36],
    original_language: "en",
    runtime: 180,
    imdb_id: "tt15398776"
  },
  {
    id: 155,
    title: "The Dark Knight",
    vote_average: 8.5,
    vote_count: 33000,
    release_date: "2008-07-16",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
    overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
    genre_ids: [18, 28, 80, 53],
    original_language: "en",
    runtime: 152,
    imdb_id: "tt0468569"
  },
  {
    id: 693134,
    title: "Dune: Part Two",
    vote_average: 8.2,
    vote_count: 6000,
    release_date: "2024-02-27",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s520DRq.jpg",
    overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.",
    genre_ids: [878, 12],
    original_language: "en",
    runtime: 166,
    imdb_id: "tt15239678"
  },
  {
    id: 299534,
    title: "Avengers: Endgame",
    vote_average: 8.3,
    vote_count: 25000,
    release_date: "2019-04-24",
    poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    overview: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more in order to undo Thanos's actions and restore order to the universe once and for all.",
    genre_ids: [12, 878, 28],
    original_language: "en",
    runtime: 181,
    imdb_id: "tt4154796"
  },
  {
    id: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    vote_average: 8.4,
    vote_count: 7000,
    release_date: "2023-05-31",
    poster_path: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdrop_path: "/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    overview: "After reuniting with Gwen Stacy, Brooklyn's full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider Society, a team of Spider-People charged with protecting the Multiverse's very existence.",
    genre_ids: [16, 28, 12, 878],
    original_language: "en",
    runtime: 140,
    imdb_id: "tt9362722"
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    vote_average: 8.7,
    vote_count: 27000,
    release_date: "1994-09-23",
    poster_path: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
    backdrop_path: "/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg",
    overview: "Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison, where he puts his accounting skills to work for an amoral warden.",
    genre_ids: [18, 80],
    original_language: "en",
    runtime: 142,
    imdb_id: "tt0111161"
  },
  {
    id: 680,
    title: "Pulp Fiction",
    vote_average: 8.5,
    vote_count: 28000,
    release_date: "1994-09-10",
    poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    overview: "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper.",
    genre_ids: [53, 80],
    original_language: "en",
    runtime: 154,
    imdb_id: "tt0110912"
  },
  {
    id: 550,
    title: "Fight Club",
    vote_average: 8.4,
    vote_count: 29000,
    release_date: "1999-10-15",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
    genre_ids: [18],
    original_language: "en",
    runtime: 139,
    imdb_id: "tt0137523"
  },
  {
    id: 98,
    title: "Gladiator",
    vote_average: 8.2,
    vote_count: 18000,
    release_date: "2000-05-04",
    poster_path: "/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    backdrop_path: "/Ar74kK2tQz7N3qU5BqU11zT2xY6.jpg",
    overview: "In the year 180, the death of emperor Marcus Aurelius throws the Roman Empire into turmoil. Maximus, one of the Roman army's most capable and trusted generals, is betrayed.",
    genre_ids: [28, 18, 12],
    original_language: "en",
    runtime: 155,
    imdb_id: "tt0172495"
  },
  {
    id: 603,
    title: "The Matrix",
    vote_average: 8.2,
    vote_count: 25000,
    release_date: "1999-03-30",
    poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    backdrop_path: "/7u3BgWiugZsVOIQ3pn9kn9NLv0.jpg",
    overview: "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
    genre_ids: [28, 878],
    original_language: "en",
    runtime: 136,
    imdb_id: "tt0133093"
  }
];

const fetchTmdbResponse = async url => {
  const fetchFn = getFetch();
  if (!fetchFn) throw new Error('Fetch function not available');
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;
  try {
    return await fetchFn(url, {
      signal: controller?.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
  } catch (err) {
    const code = err.code || err.type || err.name;
    throw new Error(`TMDB request failed${code ? ` (${code})` : ''}`);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

// Helper to call TMDB
const tmdbFetch = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.search = new URLSearchParams({
    api_key: getApiKey(),
    language: 'en-US',
    ...params,
  });
  const res = await fetchTmdbResponse(url.toString());
  const data = await res.json();
  if (!res.ok || data.status_code) {
    throw new Error(data.status_message || `TMDB returned HTTP ${res.status}`);
  }
  return data;
};

// Filter movies
const filterMovies = (movies) => {
  if (!movies || !Array.isArray(movies)) return [];
  return movies.filter(m => m && !isBlocked(m.title || m.name || ''));
};

// Trending
router.get('/trending', async (req, res) => {
  try {
    const data = await tmdbFetch('/trending/movie/day');
    const results = filterMovies(data.results || []);
    if (results.length > 0) return res.json({ success: true, results });
  } catch (err) {
    console.warn('TMDB trending fetch failed, using fallback:', err.message);
  }
  res.json({ success: true, results: FALLBACK_MOVIES });
});

// Top rated
router.get('/top-rated', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/top_rated');
    const results = filterMovies(data.results);
    if (results.length > 0) return res.json({ success: true, results });
  } catch (err) {
    console.warn('TMDB top-rated fetch failed, using fallback:', err.message);
  }
  const sorted = [...FALLBACK_MOVIES].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  res.json({ success: true, results: sorted });
});

// Now playing
router.get('/now-playing', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/now_playing');
    const results = filterMovies(data.results);
    if (results.length > 0) return res.json({ success: true, results });
  } catch (err) {
    console.warn('TMDB now-playing fetch failed, using fallback:', err.message);
  }
  res.json({ success: true, results: FALLBACK_MOVIES.slice().reverse() });
});

// Popular
router.get('/popular', async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/popular');
    const results = filterMovies(data.results);
    if (results.length > 0) return res.json({ success: true, results });
  } catch (err) {
    console.warn('TMDB popular fetch failed, using fallback:', err.message);
  }
  res.json({ success: true, results: FALLBACK_MOVIES });
});

// Discover with filters
router.get('/discover', async (req, res) => {
  try {
    const { genre, language, sort } = req.query;
    const params = {
      sort_by: sort || req.query.sort_by || 'popularity.desc',
      'vote_count.gte': 100,
    };
    const selectedGenre = genre || req.query.with_genres;
    const selectedLanguage = language || req.query.with_original_language;
    if (selectedGenre && selectedGenre !== 'all') params.with_genres = selectedGenre;
    if (selectedLanguage && selectedLanguage !== 'all') params.with_original_language = selectedLanguage;
    const data = await tmdbFetch('/discover/movie', params);
    const results = filterMovies(data.results);
    if (results.length > 0) return res.json({ success: true, results });
  } catch (err) {
    console.warn('TMDB discover fetch failed, using fallback:', err.message);
  }

  let filtered = [...FALLBACK_MOVIES];
  const selectedGenre = req.query.genre || req.query.with_genres;
  if (selectedGenre && selectedGenre !== 'all') {
    const genreNum = Number(selectedGenre);
    filtered = filtered.filter(m => (m.genre_ids || []).includes(genreNum));
    if (filtered.length === 0) filtered = FALLBACK_MOVIES;
  }
  res.json({ success: true, results: filtered });
});

// Search
router.get('/search/:query', async (req, res) => {
  const { query } = req.params;
  try {
    const params = { query };
    if (req.query.with_original_language) params.with_original_language = req.query.with_original_language;
    const data = await tmdbFetch('/search/movie', params);
    const results = filterMovies(data.results);
    if (results.length > 0) return res.json({ success: true, results });
  } catch (err) {
    console.warn('TMDB search fetch failed, using fallback:', err.message);
  }

  const q = (query || '').toLowerCase().trim();
  const matched = FALLBACK_MOVIES.filter(m =>
    (m.title && m.title.toLowerCase().includes(q)) ||
    (m.overview && m.overview.toLowerCase().includes(q))
  );
  res.json({ success: true, results: matched.length > 0 ? matched : FALLBACK_MOVIES.slice(0, 5) });
});

router.post('/compare', async (req, res) => {
  try {
    const titles = req.body?.movies || req.body?.titles;
    if (!Array.isArray(titles) || titles.length < 2 || titles.length > 5) {
      return res.status(400).json({ success: false, message: 'Provide an array of 2 to 5 movie titles' });
    }
    const normalizedTitles = titles.map(title => typeof title === 'string' ? title.trim() : '');
    if (normalizedTitles.some(title => !title || title.length > 200)) {
      return res.status(400).json({ success: false, message: 'Each movie title must be a non-empty string under 200 characters' });
    }
    if (new Set(normalizedTitles.map(title => title.toLowerCase())).size !== normalizedTitles.length) {
      return res.status(400).json({ success: false, message: 'Movie titles must be unique' });
    }
    const comparison = await compareMovies({
      titles: normalizedTitles,
      searchMovie: title => tmdbFetch('/search/movie', { query: title }),
      getDetails: id => tmdbFetch(`/movie/${id}`, { append_to_response: 'videos,credits' }),
    });
    return res.json(comparison);
  } catch (err) {
    return res.status(502).json({ success: false, message: err.message });
  }
});

router.post('/compare-ai', async (req, res) => {
  try {
    const titles = req.body?.movies || req.body?.titles;
    if (!Array.isArray(titles) || titles.length < 2 || titles.length > 5) {
      return res.status(400).json({ message: 'Provide an array of 2 to 5 movie titles' });
    }
    return res.json(await getCinevoraComparison(titles));
  } catch (err) {
    const status = err.message === 'GEMINI_API_KEY is not configured' ? 503 : 502;
    return res.status(status).json({ message: err.message });
  }
});

router.get('/reception/:movieId', async (req, res) => {
  const { movieId } = req.params;
  if (!/^\d{1,12}$/.test(movieId)) {
    return res.status(400).json({ success: false, message: 'A valid TMDB movie ID is required' });
  }
  try {
    const data = await getAudienceReception(movieId);
    return res.json({ success: true, data });
  } catch (err) {
    const status = err.message === 'Movie was not found on TMDB'
      ? 404
      : err.message === 'TMDB_API_KEY is not configured' ? 503 : 502;
    return res.status(status).json({ success: false, message: err.message });
  }
});

// Movie detail
router.get('/detail/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const data = await tmdbFetch(`/movie/${id}`, { append_to_response: 'videos,credits,recommendations' });
    if (data && !data.status_code) {
      return res.json({ success: true, data });
    }
  } catch (err) {
    console.warn(`TMDB detail fetch for ${id} failed, using fallback:`, err.message);
  }

  const fallback = FALLBACK_MOVIES.find(m => String(m.id) === String(id) || m.imdb_id === id) || FALLBACK_MOVIES[0];
  const detailData = {
    ...fallback,
    genres: (fallback.genre_ids || []).map(gid => ({ id: gid, name: 'Movie' })),
    credits: {
      cast: [{ name: 'Cast Member 1' }, { name: 'Cast Member 2' }],
      crew: [{ job: 'Director', name: 'Director' }]
    },
    recommendations: {
      results: FALLBACK_MOVIES.filter(m => m.id !== fallback.id).slice(0, 6)
    }
  };
  res.json({ success: true, data: detailData });
});

// Find by IMDb ID
router.get('/find/:imdbId', async (req, res) => {
  const { imdbId } = req.params;
  try {
    const data = await tmdbFetch('/find/' + imdbId, { external_source: 'imdb_id' });
    const results = data?.movie_results || [];
    if (results.length > 0) {
      const movie = results[0];
      if (isBlocked(movie.title)) {
        return res.status(403).json({ success: false, message: 'Blocked content' });
      }
      return res.json({ success: true, data: movie });
    }
  } catch (err) {
    console.warn(`TMDB find for ${imdbId} failed, using fallback:`, err.message);
  }

  const fallback = FALLBACK_MOVIES.find(m => m.imdb_id === imdbId) || FALLBACK_MOVIES[0];
  res.json({ success: true, data: fallback });
});

module.exports = router;