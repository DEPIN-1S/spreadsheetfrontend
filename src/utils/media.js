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
const R2_PUBLIC_URL = (
    import.meta.env.VITE_R2_PUBLIC_URL ||
    "https://pub-f0142185ae6c407ea518cb8b30b55497.r2.dev"
).replace(/\/$/, "");

/**
 * Resolves a media path (image, pdf, etc.) to a full URL.
 * Absolute http(s) values are returned unchanged.
 * /uploads/ and /images/ paths use the R2 public URL.
 * Every other relative path still uses the API host.
 *
 * @param {string} path - The relative or absolute path to the media.
 * @returns {string} The full URL to the media.
 */
export const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (
        R2_PUBLIC_URL &&
        (normalizedPath.startsWith('/uploads/') || normalizedPath.startsWith('/images/'))
    ) {
        return `${R2_PUBLIC_URL}${normalizedPath}`;
    }
    return `${BACKEND_URL}${normalizedPath}`;
};
