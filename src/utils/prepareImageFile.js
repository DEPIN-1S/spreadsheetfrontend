const HEIC_EXT = new Set(["heic", "heif", "heics", "heifs"]);
const EXT_MIME = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff"
};
const LARGE_BYTES = 2.5 * 1024 * 1024;
const MAX_EDGE = 2000;

function extensionOf(name) {
    const match = /\.([a-z0-9]+)$/i.exec(name || "");
    return match ? match[1].toLowerCase() : "";
}

function withType(file, name, type) {
    return new File([file], name, { type, lastModified: file.lastModified });
}

async function encodeJpeg(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("Could not encode image");
    const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

/**
 * Phone cameras upload HEIC, or JPEG with an empty MIME type, and full-size
 * photos are large enough for the upload limit to reject them. Normalize those
 * to a JPEG the sheet can store and display. Files that are already a normal
 * web image are left unchanged.
 */
export async function prepareImageFile(file) {
    const ext = extensionOf(file.name);
    const type = (file.type || "").toLowerCase();
    const heic = type.includes("heic") || type.includes("heif") || HEIC_EXT.has(ext);
    const mimeMissing = !type || type === "application/octet-stream";
    const large = file.size > LARGE_BYTES;

    if (!heic && !mimeMissing && !large) return file;

    try {
        return await encodeJpeg(file);
    } catch {
        if (mimeMissing && EXT_MIME[ext]) {
            return withType(file, file.name || `photo.${ext}`, EXT_MIME[ext]);
        }
        return file;
    }
}

export function uploadErrorText(error) {
    const message = error?.response?.data?.message || error?.message;
    if (typeof message === "string" && message.trim() && !/^Request failed with status code \d+$/i.test(message)) {
        return message;
    }
    if (error?.response?.status === 413) return "That photo is too large. Choose a smaller one.";
    if (error?.response?.status === 401) return "Your session expired. Sign in and upload again.";
    if (error?.response?.status === 429) return "Too many requests. Wait a few minutes and try again.";
    if (!error?.response) return "Upload failed. Check the connection and try again.";
    return "Upload failed. The file type was rejected or the file is too large.";
}

export const IMAGE_FILE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/*";
