"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

const OPEN_EVENT = "sheet-plan:glossary-open";

export function GlossaryTip({
  term,
  align = "start",
}: {
  term: GlossaryKey;
  align?: "start" | "end";
}) {
  const entry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;

    function onPeerOpen(e: Event) {
      const other = (e as CustomEvent<string>).detail;
      if (other !== tipId) setOpen(false);
    }
    function onDocPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener(OPEN_EVENT, onPeerOpen);
    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onPeerOpen);
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, tipId]);

  function toggle() {
    setOpen((was) => {
      const next = !was;
      if (next) {
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: tipId }));
      }
      return next;
    });
  }

  return (
    <span className={`glossary glossary-${align}`} ref={wrapRef}>
      <button
        type="button"
        className="glossary-mark"
        aria-label={`What is ${entry.label}?`}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
      >
        ?
      </button>
      {open && (
        <span role="tooltip" id={tipId} className="glossary-tip">
          {entry.def}
        </span>
      )}
    </span>
  );
}

export function TermLabel({
  children,
  term,
  align,
}: {
  children: ReactNode;
  term: GlossaryKey;
  align?: "start" | "end";
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <GlossaryTip term={term} align={align} />
    </span>
  );
}
