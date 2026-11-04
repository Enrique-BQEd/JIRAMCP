import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MAX_CHARS = 500_000;

export type DocumentExtraction = {
  format: "pdf" | "docx";
  text: string;
  truncated: boolean;
  pages?: number;
  warnings?: string[];
};

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function limitText(text: string): Pick<DocumentExtraction, "text" | "truncated"> {
  if (text.length <= DOCUMENT_MAX_CHARS) {
    return { text, truncated: false };
  }
  return {
    text: `${text.slice(0, DOCUMENT_MAX_CHARS)}\n\n[Contenido truncado por límite de seguridad]`,
    truncated: true,
  };
}

export async function extractPdf(buffer: Buffer): Promise<DocumentExtraction> {
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    const limited = limitText(normalizeText(parsed.text));
    return {
      format: "pdf",
      ...limited,
      pages: parsed.total,
      warnings: parsed.text.trim()
        ? undefined
        : ["El PDF no contiene texto extraíble; puede ser un PDF escaneado y requerir OCR."],
    };
  } finally {
    await parser.destroy();
  }
}

export async function extractDocx(buffer: Buffer): Promise<DocumentExtraction> {
  const parsed = await mammoth.extractRawText({ buffer });
  const limited = limitText(normalizeText(parsed.value));
  const warnings = parsed.messages.map((message) => message.message);
  return {
    format: "docx",
    ...limited,
    warnings: warnings.length ? warnings : undefined,
  };
}

export function supportedDocumentFormat(
  filename: string,
  mimeType: string,
): "pdf" | "docx" | undefined {
  const normalizedFilename = filename.toLowerCase();
  if (normalizedFilename.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (
    normalizedFilename.endsWith(".docx") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return undefined;
}
