import apiClient from "../api/apiClient";
import { prepareImageFile } from "./prepareImageFile";

export function fileMetaFromUpload(file) {
    return {
        url: file.fileUrl,
        fileName: file.originalName,
        fileSize: file.sizeBytes,
        mimeType: file.mimeType,
        uploadedAt: file.createdAt || new Date().toISOString()
    };
}

export async function uploadMediaFiles(files, { prepareImages = false } = {}) {
    const formData = new FormData();
    for (const file of files) {
        formData.append("files", prepareImages ? await prepareImageFile(file) : file);
    }
    const resp = await apiClient.post("/media/upload-multiple", formData);
    const uploaded = resp.data?.data;
    if (!Array.isArray(uploaded) || uploaded.length === 0) {
        throw new Error("Upload failed. The server did not return any files.");
    }
    return uploaded.map(fileMetaFromUpload);
}
