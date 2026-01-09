/**
 * Download utilities for handling file downloads in the browser
 */

/**
 * Download a Blob as a file
 * @param blob - The Blob data to download
 * @param filename - The filename for the downloaded file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download a file from a URL
 * @param url - The URL to download from
 * @param filename - Optional filename (if not provided, browser will use the URL's filename)
 */
export const downloadFromUrl = (url: string, filename?: string): void => {
  const link = document.createElement("a");
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Convert base64 string to Blob
 * @param base64 - Base64 encoded string
 * @param mimeType - MIME type of the file
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * Download base64 data as a file
 * @param base64 - Base64 encoded string
 * @param filename - The filename for the downloaded file
 * @param mimeType - MIME type of the file
 */
export const downloadBase64 = (
  base64: string,
  filename: string,
  mimeType: string
): void => {
  const blob = base64ToBlob(base64, mimeType);
  downloadBlob(blob, filename);
};
