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

const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEFAULT_TMDB_API_KEY = 'c00a129541b13f723b08893d51be29ea';
const getApiKey = () => process.env.TMDB_API_KEY || DEFAULT_TMDB_API_KEY;

const tmdbFetch = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.search = new URLSearchParams({
    api_key: getApiKey(),
    language: 'en-US',
    ...params,
  });
  const fetchFn = getFetch();
  if (!fetchFn) throw new Error('Fetch function not available');
  const res = await fetchFn(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  return res.json();
};

const filterMovies = (movies) => {
  if (!movies) return [];
  return movies.filter(m => !isBlocked(m.title || m.name));
};

// Trending
exports.getTrending = async (req, res) => {
  try {
    const data = await tmdbFetch('/trending/movie/day');
    res.json({ success: true, results: filterMovies(data.results || []) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Top Rated
exports.getTopRated = async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/top_rated');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Now Playing
exports.getNowPlaying = async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/now_playing');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Popular
exports.getPopular = async (req, res) => {
  try {
    const data = await tmdbFetch('/movie/popular');
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Discover
exports.discover = async (req, res) => {
  try {
    const { genre, language, sort } = req.query;
    const params = {
      sort_by: sort || 'popularity.desc',
      'vote_count.gte': 100,
    };
    if (genre && genre !== 'all') params.with_genres = genre;
    if (language && language !== 'all') params.with_original_language = language;
    const data = await tmdbFetch('/discover/movie', params);
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Search
exports.search = async (req, res) => {
  try {
    const { query } = req.params;
    const data = await tmdbFetch('/search/movie', { query });
    res.json({ success: true, results: filterMovies(data.results) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Detail
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await tmdbFetch(`/movie/${id}`, { append_to_response: 'videos,credits,recommendations' });
    if (!data || data.status_code) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Find by IMDb ID
exports.findByImdb = async (req, res) => {
  try {
    const { imdbId } = req.params;
    const data = await tmdbFetch('/find/' + imdbId, { external_source: 'imdb_id' });
    const results = data?.movie_results || [];
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const movie = results[0];
    if (isBlocked(movie.title)) {
      return res.status(403).json({ success: false, message: 'Blocked content' });
    }
    res.json({ success: true, data: movie });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};