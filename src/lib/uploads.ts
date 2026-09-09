/**
 * Upload rules shared by the browser and the server.
 *
 * This file must stay free of database imports: it is pulled into a client
 * component, and anything it touches is bundled and shipped to the browser.
 */
/**
 * Files go from the browser straight to storage, so the ~4.5 MB cap on a
 * serverless request body does not apply. This ceiling is our own choice.
 */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_LABEL = "100 MB";

/** Above this the browser uploads in parallel chunks and retries failed ones. */
export const MULTIPART_ABOVE_BYTES = 8 * 1024 * 1024;

/** What still fits through the old server route, kept as a fallback. */
export const DIRECT_POST_LIMIT_BYTES = 4 * 1024 * 1024;

/** Everything lives under one folder per task, and nothing may escape it. */
export function taskFolder(taskId: string) {
  return `staff-tasks/${taskId}/`;
}

/** Strip anything that could escape the task's folder or confuse a browser. */
export function safeName(name: string) {
  return (name.split(/[\\/]/).pop() ?? "file")
    .replace(/[^\w.\- ]+/g, "_")
    .slice(0, 120) || "file";
}

/** Office documents and images. Executables and scripts are deliberately absent. */
export const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "audio/mpeg",
];

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
