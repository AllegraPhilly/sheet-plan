import type { ColorPath, JobInput } from "./types";

const SIZE_ALIASES: Record<string, { w: number; h: number }> = {
  letter: { w: 8.5, h: 11 },
  "8.5x11": { w: 8.5, h: 11 },
  "8.5×11": { w: 8.5, h: 11 },
  "8511": { w: 8.5, h: 11 },
  tabloid: { w: 11, h: 17 },
  "11x17": { w: 11, h: 17 },
  "11×17": { w: 11, h: 17 },
  legal: { w: 8.5, h: 14 },
  "8.5x14": { w: 8.5, h: 14 },
  "12x18": { w: 12, h: 18 },
  "13x19": { w: 13, h: 19 },
  "5x7": { w: 5, h: 7 },
  "4x6": { w: 4, h: 6 },
  "4x9": { w: 4, h: 9 },
  postcard: { w: 4.25, h: 6 },
  "a2": { w: 4.25, h: 5.5 },
  "10env": { w: 4.125, h: 9.5 },
  "#10": { w: 4.125, h: 9.5 },
};

export function parseSizeToken(raw: string): { w: number; h: number } | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (SIZE_ALIASES[key]) return SIZE_ALIASES[key];
  const m = key.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

export function parseJobText(description: string, fallback?: Partial<JobInput>): JobInput {
  const text = description.toLowerCase();
  const qtyMatch = text.match(
    /(?:qty|quantity|run|print)?\s*(\d{1,6})\s*(?:pcs|pieces|sheets|copies|flyers|cards|invites|brochures|postcards|envelopes)?/,
  );
  const qty = fallback?.qty && fallback.qty > 0 ? fallback.qty : qtyMatch ? Number(qtyMatch[1]) : 1;

  let size = fallback?.finishW && fallback.finishH
    ? { w: fallback.finishW, h: fallback.finishH }
    : null;
  if (!size) {
    const sizeMatch = description.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    if (sizeMatch) size = { w: Number(sizeMatch[1]), h: Number(sizeMatch[2]) };
  }
  if (!size) {
    for (const [alias, dims] of Object.entries(SIZE_ALIASES)) {
      if (text.includes(alias)) {
        size = dims;
        break;
      }
    }
  }
  if (!size) size = { w: 8.5, h: 11 };

  let color: ColorPath = fallback?.color ?? "color";
  if (/\bmixed\b/.test(text)) color = "mixed";
  else if (/\b(b\/?w|black\s*and\s*white|grayscale|mono)\b/.test(text)) color = "bw";
  else if (/\b(color|colour|cmyk|full[\s-]?color)\b/.test(text)) color = "color";

  let sides: 1 | 2 = fallback?.sides ?? 1;
  if (/\b(duplex|two[\s-]?sided|2[\s-]?sided|double[\s-]?sided)\b/.test(text)) sides = 2;
  if (/\b(simplex|one[\s-]?sided|1[\s-]?sided|single[\s-]?sided)\b/.test(text)) sides = 1;

  let substrate: JobInput["substrate"] = fallback?.substrate ?? "paper";
  if (/\b(vinyl|decal|vehicle wrap|wall wrap)\b/.test(text)) substrate = "vinyl";
  else if (/\b(shirt|hoodie|garment|hat|tote)\b/.test(text)) substrate = "garment";
  else if (/\b(envelopes?|#10|a7\s*env)\b/.test(text) || text.includes("#10")) {
    substrate = "envelope";
  }
  else if (/\b(uv coating|uv print|plastic card)\b/.test(text)) substrate = "uv";

  let fold: JobInput["fold"] = fallback?.fold ?? "none";
  if (/\btri[\s-]?fold\b/.test(text)) fold = "tri";
  else if (/\bz[\s-]?fold\b/.test(text)) fold = "z";
  else if (/\bletter[\s-]?fold\b/.test(text)) fold = "letter";
  else if (/\b(half[\s-]?fold|fold in half)\b/.test(text)) fold = "half";

  let bind: JobInput["bind"] = fallback?.bind ?? "none";
  if (/\b(coil|spiral)\b/.test(text)) bind = "coil";
  else if (/\bside[\s-]?staple/.test(text)) bind = "side-staple";
  else if (/\b(saddle([\s-]?stitch|[\s-]?booklet)?|booklet)\b/.test(text)) bind = "saddle";
  else if (/\b(corner[\s-]?staple|staple|stitch)\b/.test(text)) bind = "staple";
  else if (/\b(3[\s-]?hole|drill)\b/.test(text)) bind = "drill";
  else if (/\blaminat/.test(text)) bind = "laminate";
  else if (/\bshrink/.test(text)) bind = "shrink";

  let pages = fallback?.pages;
  const pageMatch = text.match(/(\d{1,4})\s*[\s-]?pages?\b/);
  if (pageMatch) pages = Number(pageMatch[1]);

  let stockHint = fallback?.stockHint;
  if (/cover|card\s*stock|100#|80#\s*c/.test(text)) stockHint = stockHint ?? "cover";

  if (bind === "saddle") {
    sides = 2;
    fold = "half";
  }

  const scannedOriginal = /\b(scan|original|hard copy)\b/.test(text);

  let colorPages = fallback?.colorPages;
  let bwPages = fallback?.bwPages;
  let colorQty = fallback?.colorQty;
  let bwQty = fallback?.bwQty;
  const coverMix = text.match(/(\d+)\s*color(?:\s*cover)?\s*\/\s*(\d+)\s*b\s*&\s*w/);
  if (coverMix) {
    colorPages = Number(coverMix[1]);
    bwPages = Number(coverMix[2]);
    color = "mixed";
  } else if (color === "mixed" && bind === "saddle" && pages) {
    colorPages = colorPages ?? Math.min(4, pages);
    bwPages = bwPages ?? pages - colorPages;
  } else if (color === "mixed" && bind !== "saddle") {
    const split = text.match(/(\d+)\s*color\s*\/\s*(\d+)\s*b\s*&\s*w/);
    if (split) {
      colorQty = Number(split[1]);
      bwQty = Number(split[2]);
    } else {
      colorQty = colorQty ?? qty;
      bwQty = bwQty ?? 0;
    }
  }

  return {
    description,
    qty: Math.max(1, qty),
    finishW: size.w,
    finishH: size.h,
    color,
    sides,
    fold,
    bind,
    pages,
    colorPages,
    bwPages,
    colorQty,
    bwQty,
    stockHint,
    substrate,
    scannedOriginal,
  };
}
