export type OcrStrategy = "pdf-parse" | "llamaparse-fast" | "llamaparse-cost" | "mistral-batch";

export interface OcrResult {
  text: string;
  strategy: OcrStrategy;
}

// ── Polyfill DOM APIs requeridas por pdfjs-dist en entornos Node.js ──────────
if (typeof globalThis.DOMMatrix === "undefined") {
  // @ts-ignore
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { return this; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromMatrix() { return new (globalThis as any).DOMMatrix(); }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  // @ts-ignore
  globalThis.Path2D = class Path2D {};
}

// ── Detección de tipo de PDF ──────────────────────────────────────────────────

async function hasExtractableText(buffer: Buffer): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule = await import("pdf-parse") as any;
    const pdfParse = pdfModule.default ?? pdfModule;
    const { text } = await pdfParse(buffer, { max: 3 }); // solo primeras 3 páginas
    return text.trim().length > 100;
  } catch {
    return false;
  }
}

const STEM_KEYWORDS = [
  "cálculo", "calculo", "física", "fisica", "matemática", "matematica",
  "química", "quimica", "estadística", "estadistica", "álgebra", "algebra",
  "termodinámica", "termodinamica", "electromagnetismo", "mecánica", "mecanica",
  "análisis matemático", "probabilidad", "cálculo vectorial",
];

function isStem(subjectName = ""): boolean {
  const lower = subjectName.toLowerCase();
  return STEM_KEYWORDS.some(k => lower.includes(k));
}

// ── LlamaParse (digital PDFs con/sin fórmulas) ────────────────────────────────

async function llamaParse(buffer: Buffer, tier: "fast" | "cost-effective"): Promise<string> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), "document.pdf");
  if (tier === "cost-effective") {
    formData.append("parsing_instruction", "Extract all text. Preserve mathematical formulas in LaTeX notation (e.g. $\\int_a^b f(x)dx$).");
  }

  const uploadResp = await fetch("https://api.cloud.llamaindex.ai/api/v1/parsing/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` },
    body: formData,
  });
  if (!uploadResp.ok) throw new Error(`LlamaParse upload ${uploadResp.status}`);
  const { id: jobId } = await uploadResp.json() as { id: string };

  // Poll until ready (máx 120s = 24 × 5s)
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5_000));
    const resultResp = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`,
      { headers: { Authorization: `Bearer ${process.env.LLAMAPARSE_API_KEY}` } }
    );
    if (resultResp.ok) {
      const { markdown } = await resultResp.json() as { markdown: string };
      return markdown;
    }
    if (resultResp.status !== 404) throw new Error(`LlamaParse poll ${resultResp.status}`);
  }
  throw new Error("LlamaParse timeout after 120s");
}

// ── Mistral OCR (PDFs escaneados sin fórmulas) ────────────────────────────────

async function mistralOcr(buffer: Buffer): Promise<string> {
  const base64 = buffer.toString("base64");
  const resp = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        document_url: `data:application/pdf;base64,${base64}`,
      },
    }),
  });
  if (!resp.ok) throw new Error(`Mistral OCR ${resp.status}`);
  const data = await resp.json() as { pages?: { markdown: string }[] };
  return data.pages?.map(p => p.markdown).join("\n\n") ?? "";
}

// ── pdf-parse fallback (siempre disponible) ───────────────────────────────────

async function pdfParseFallback(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfModule = await import("pdf-parse") as any;
  const pdfParse = pdfModule.default ?? pdfModule;
  const { text } = await pdfParse(buffer);
  return text as string;
}

// ── Pipeline principal ────────────────────────────────────────────────────────
//
// Lógica de routing:
//  Digital + STEM    → LlamaParse Cost-effective  ($0.00375/pág, preserva LaTeX)
//  Digital + no STEM → LlamaParse Fast             ($0.00125/pág)
//  Escaneado         → Mistral OCR Batch           ($0.002/pág)
//  Sin API keys      → pdf-parse                   (gratis, calidad básica)
//
export async function extractText(buffer: Buffer, subjectName?: string): Promise<OcrResult> {
  const digital = await hasExtractableText(buffer);

  if (digital && process.env.LLAMAPARSE_API_KEY) {
    const tier = isStem(subjectName) ? "cost-effective" : "fast";
    try {
      const text = await llamaParse(buffer, tier);
      return { text, strategy: tier === "cost-effective" ? "llamaparse-cost" : "llamaparse-fast" };
    } catch {
      // LlamaParse falló → caer a pdf-parse (el PDF es digital, tenemos texto)
      return { text: await pdfParseFallback(buffer), strategy: "pdf-parse" };
    }
  }

  if (!digital && process.env.MISTRAL_API_KEY) {
    try {
      const text = await mistralOcr(buffer);
      return { text, strategy: "mistral-batch" };
    } catch {
      // Mistral falló → pdf-parse best-effort
    }
  }

  // Fallback universal
  return { text: await pdfParseFallback(buffer), strategy: "pdf-parse" };
}
