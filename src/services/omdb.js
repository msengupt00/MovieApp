const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY || 'a5aed864';
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

/**
 * Search movies by title (returns multiple results)
 * @param {string} query - Movie title to search
 * @returns {Promise<Array>} Array of search results
 */
export async function searchMovies(query) {
  if (!query || query.trim().length < 2) return [];

  const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query.trim())}&type=movie`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.Response === 'False') return [];

  return data.Search.map((m) => ({
    imdbID: m.imdbID,
    title: m.Title,
    year: m.Year,
    poster: m.Poster !== 'N/A' ? m.Poster : null,
  }));
}

/**
 * Get full movie details by IMDb ID
 * @param {string} imdbID - IMDb ID (e.g., "tt1375666")
 * @returns {Promise<Object|null>} Full movie data or null
 */
export async function getMovieDetails(imdbID) {
  const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=short`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.Response === 'False') return null;

  // Extract Rotten Tomatoes rating from Ratings array
  const rtEntry = data.Ratings?.find((r) => r.Source === 'Rotten Tomatoes');

  return {
    imdbID: data.imdbID,
    title: data.Title,
    year: data.Year,
    poster: data.Poster !== 'N/A' ? data.Poster : null,
    plot: data.Plot,
    director: data.Director,
    actors: data.Actors ? data.Actors.split(', ').slice(0, 3) : [],
    imdbRating: data.imdbRating,
    rtRating: rtEntry ? rtEntry.Value : 'N/A',
    runtime: data.Runtime,
  };
}

/**
 * Search and get full details for the top result
 * @param {string} query - Movie title
 * @returns {Promise<Object|null>} Full movie data or null
 */
export async function searchAndGetDetails(query) {
  const results = await searchMovies(query);
  if (results.length === 0) return null;
  return getMovieDetails(results[0].imdbID);
}
