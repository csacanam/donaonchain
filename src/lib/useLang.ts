"use client";

import { useSyncExternalStore } from "react";
import type { Lang } from "./content";

const STORAGE_KEY = "donaonchain:lang";

/**
 * Language state, defaulting to the visitor's own.
 *
 * Built on `useSyncExternalStore` rather than an effect. The server has no
 * `navigator` and no `localStorage`, so the language can only be known on the
 * client — and this hook is exactly what that situation is for: React renders
 * the server snapshot during hydration, then re-renders with the client's.
 * Reading it in an effect instead would mean a setState on every mount.
 *
 * An explicit choice is remembered and beats detection: someone who switched
 * to English on a Spanish-language phone meant it.
 */

const listeners = new Set<() => void>();

/**
 * Cached because `getSnapshot` must return a stable reference between calls —
 * React re-renders in a loop if it does not.
 */
let current: Lang | null = null;

function detect(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    // Private browsing can throw on localStorage; fall through to detection.
  }

  const langs = window.navigator.languages ?? [window.navigator.language];
  // Matches "es", "es-CO", "es-419" — Spanish in any region.
  return langs.some((l) => l?.toLowerCase().startsWith("es")) ? "es" : "en";
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Lang {
  if (current === null) current = detect();
  return current;
}

/** The prerendered HTML is English; a Spanish visitor flips on hydration. */
function getServerSnapshot(): Lang {
  return "en";
}

export function useLang(): [Lang, (lang: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setLang(next: Lang) {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference is not remembered; the toggle still works this visit.
    }
    for (const listener of listeners) listener();
  }

  return [lang, setLang];
}
