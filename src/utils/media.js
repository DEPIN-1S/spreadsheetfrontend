// Helper to get the base URL without the path
const getBaseUrl = () => {
    const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6043/api';
    try {
        const url = new URL(rawUrl);
        return `${url.protocol}//${url.host}`;
    } catch (e) {
        // Fallback for relative or malformed URLs
        return rawUrl.replace(/\/api$/, '').replace(/\/api\/$/, '');
    }
};

const BACKEND_URL = getBaseUrl();

/**
 * Resolves a media path (image, pdf, etc.) to a full URL.
 * If the path is already absolute (starts with http/https), it returns it as is.
 * Otherwise, it prepends the backend base URL.
 * 
 * @param {string} path - The relative or absolute path to the media.
 * @returns {string} The full URL to the media.
 */
export const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // Ensure relative paths start with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${BACKEND_URL}${normalizedPath}`;
};
