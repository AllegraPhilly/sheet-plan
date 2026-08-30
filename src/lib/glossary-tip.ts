export type TipMode = "closed" | "hover" | "pinned";

export type TipAction = "hover-enter" | "hover-leave" | "click" | "dismiss";

/** Desktop hover previews; click pins. Phone only uses click / dismiss. */
export function nextTipMode(mode: TipMode, action: TipAction): TipMode {
  switch (action) {
    case "dismiss":
      return "closed";
    case "hover-enter":
      return mode === "pinned" ? "pinned" : "hover";
    case "hover-leave":
      return mode === "hover" ? "closed" : mode;
    case "click":
      return mode === "pinned" ? "closed" : "pinned";
  }
}
