/**
 * API Configuration
 * Configures the base URL for all API calls based on environment
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export { API_URL, SOCKET_URL };

/**
 * Helper function to construct full API URLs
 * @param {string} endpoint - The API endpoint (e.g., '/api/users/profile')
 * @returns {string} The full API URL
 */
export const getAPIUrl = (endpoint) => {
  return `${API_URL}${endpoint}`;
};

/**
 * Helper function to construct full image URLs
 * @param {string} imagePath - The image path from the server (e.g., '/public/posters/movie.jpg')
 * @returns {string} The full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_URL}${imagePath}`;
};
