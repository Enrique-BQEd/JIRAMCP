import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  DOCUMENT_MAX_CHARS,
  extractDocx,
  extractPdf,
  supportedDocumentFormat,
} from "../src/attachments/document-extractor.js";

function makeMinimalPdf(text: string): Buffer {
  const body = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${text.length + 39} >>
stream
BT
/F1 12 Tf
72 720 Td
(${text}) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;
  return Buffer.from(body);
}

async function makeMinimalDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("document extractors", () => {
  it("extracts text from a PDF", async () => {
    const result = await extractPdf(makeMinimalPdf("Hello PDF"));
    expect(result.format).toBe("pdf");
    expect(result.text).toContain("Hello PDF");
    expect(result.pages).toBe(1);
  });

  it("extracts text from a DOCX", async () => {
    const result = await extractDocx(await makeMinimalDocx("Hello DOCX"));
    expect(result.format).toBe("docx");
    expect(result.text).toContain("Hello DOCX");
  });

  it("recognizes supported formats and rejects others", () => {
    expect(supportedDocumentFormat("manual.pdf", "application/pdf")).toBe("pdf");
    expect(
      supportedDocumentFormat(
        "manual.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
    expect(supportedDocumentFormat("video.mp4", "video/mp4")).toBeUndefined();
  });

  it("limits extracted output", async () => {
    const result = await extractDocx(await makeMinimalDocx("x".repeat(DOCUMENT_MAX_CHARS + 100)));
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThan(DOCUMENT_MAX_CHARS + 100);
  });
});
