import fs from "fs";
// pdf-parse ships without types; the require form keeps the callback-free API.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse");

export interface PdfPage {
  page: number;
  text: string;
}

/**
 * pdf-parse gives us the whole document as one string plus a page render
 * callback. We hook the per-page callback so we can keep page boundaries,
 * which the blueprint segmenter relies on.
 */
export async function extractPdfPages(filePath: string): Promise<PdfPage[]> {
  const buffer = fs.readFileSync(filePath);
  const pages: PdfPage[] = [];

  await pdfParse(buffer, {
    pagerender: (pageData: any) => {
      const renderOptions = { normalizeWhitespace: false, disableCombineTextItems: false };
      return pageData.getTextContent(renderOptions).then((textContent: any) => {
        const text = textContent.items.map((item: any) => item.str).join(" ");
        pages.push({ page: pages.length + 1, text });
        return text;
      });
    },
  });

  if (pages.length === 0) {
    throw new Error("The uploaded PDF did not contain any extractable text.");
  }

  return pages;
}
