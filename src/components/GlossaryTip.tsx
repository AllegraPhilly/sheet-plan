"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { nextTipMode, type TipMode } from "@/lib/glossary-tip";
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
  const [mode, setMode] = useState<TipMode>("closed");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const leaveTimer = useRef<number | null>(null);
  const tipId = useId();
  const open = mode !== "closed";

  function clearLeaveTimer() {
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }

  function apply(action: Parameters<typeof nextTipMode>[1]) {
    setMode((current) => nextTipMode(current, action));
  }

  useEffect(() => {
    return () => clearLeaveTimer();
  }, []);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: tipId }));

    function onPeerOpen(e: Event) {
      const other = (e as CustomEvent<string>).detail;
      if (other !== tipId) {
        clearLeaveTimer();
        setMode("closed");
      }
    }
    function onDocPointer(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        clearLeaveTimer();
        setMode("closed");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearLeaveTimer();
        setMode("closed");
      }
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

  return (
    <span
      className={`glossary glossary-${align}`}
      ref={wrapRef}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        clearLeaveTimer();
        apply("hover-enter");
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        clearLeaveTimer();
        leaveTimer.current = window.setTimeout(() => apply("hover-leave"), 140);
      }}
    >
      <button
        type="button"
        className="glossary-mark"
        aria-label={`What is ${entry.label}?`}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearLeaveTimer();
          apply("click");
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
