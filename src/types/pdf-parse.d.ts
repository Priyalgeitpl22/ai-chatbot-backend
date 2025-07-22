declare module 'pdf-parse' {
  import { Buffer } from 'buffer';

  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }

  function pdfParse(
    buffer: Buffer | Uint8Array,
    options?: any
  ): Promise<PDFData>;

  export = pdfParse;
}
