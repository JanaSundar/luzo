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
    const bytes = new Uint8Array(rawData);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    body = typeof btoa !== "undefined" ? btoa(binary) : "";
  } else {
    body = new TextDecoder().decode(rawData);
  }

  return { body, size };
}
