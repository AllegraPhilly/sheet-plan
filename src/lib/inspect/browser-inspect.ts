import { inspectImageBitmap, inspectPdfPageBox, type InspectedFile } from "./file-inspect";

export async function inspectFileInBrowser(file: File): Promise<InspectedFile> {
  if (file.type.startsWith("image/")) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      return inspectImageBitmap(file.name, file.type, img.naturalWidth, img.naturalHeight);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const data = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    return inspectPdfPageBox(file.name, doc.numPages, viewport.width, viewport.height);
  }

  return {
    name: file.name,
    mime: file.type || "application/octet-stream",
    pages: 1,
    widthIn: null,
    heightIn: null,
    source: "unknown",
    notes: ["Could not read finish size. Enter size on the ticket."],
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}
