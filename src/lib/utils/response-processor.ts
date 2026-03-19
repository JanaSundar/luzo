export interface ProcessedResponse {
  body: string;
  size: number;
}

/**
 * Handles conversion of raw ArrayBuffer from response into appropriate body format.
 * Automatically handles binary (images/PDFs) by converting to Base64.
 */
export async function processResponseBody(
  rawData: ArrayBuffer,
  contentType: string
): Promise<ProcessedResponse> {
  const size = rawData.byteLength;
  const lowerContentType = contentType.toLowerCase().split(";")[0].trim();

  const isImage = /^image\//.test(lowerContentType);
  const isPdf = lowerContentType === "application/pdf";
  const isBinaryPreview = isImage || isPdf;

  let body: string;
  if (isBinaryPreview && rawData.byteLength > 0) {
    if (typeof Buffer !== "undefined") {
      body = Buffer.from(rawData).toString("base64");
    } else {
      // Browser fallback (efficient chunked approach)
      const bytes = new Uint8Array(rawData);
      let binary = "";
      const CHUNK_SIZE = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
      }
      body = btoa(binary);
    }
  } else {
    body = new TextDecoder().decode(rawData);
  }

  return { body, size };
}
