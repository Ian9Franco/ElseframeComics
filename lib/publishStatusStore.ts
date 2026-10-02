"use client";

import { useSyncExternalStore } from "react";

export type PublishPhase = "idle" | "starting" | "running" | "success" | "error";

export type PublishState = {
  phase: PublishPhase;
  runId: number | null;
  since: number | null;
  currentStep: string | null;
  failedStep: string | null;
  errors: string[];
  warnings: string[];
  finishedAt: number | null;
};

const STORAGE_KEY = "elseframe_publish_state";
const POLL_MS = 4000;
const GITHUB_ACTIONS_RUNS = "https://github.com/Ian9Franco/ElseframeComics/actions/runs/";

const idle: PublishState = {
  phase: "idle",
  runId: null,
  since: null,
  currentStep: null,
  failedStep: null,
  errors: [],
  warnings: [],
  finishedAt: null,
};

let state: PublishState = idle;
let hydrated = false;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function editorPassword() {
  return typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
}

function setState(next: Partial<PublishState>) {
  state = { ...state, ...next };
  if (typeof window !== "undefined") {
    if (state.phase === "idle") sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = { ...idle, ...JSON.parse(saved) };
      if (state.phase === "running" || state.phase === "starting") schedulePoll(0);
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function schedulePoll(delay = POLL_MS) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(poll, delay);
}

async function poll() {
  pollTimer = null;
  if (state.phase !== "running" && state.phase !== "starting") return;
  const params = new URLSearchParams();
  if (state.runId) params.set("runId", String(state.runId));
  else if (state.since) params.set("since", String(state.since));
  try {
    const res = await fetch(`/api/editor/publish?${params}`, {
      headers: { "x-editor-password": editorPassword() },
      cache: "no-store",
    });
    const d = await res.json();
    if (state.phase !== "running" && state.phase !== "starting") return;
    const status = d.status as string;
    const done = status === "success" || status === "error";
    setState({
      phase: done ? (status as PublishPhase) : "running",
      runId: d.runId ?? state.runId,
      currentStep: d.currentStep ?? null,
      failedStep: d.failedStep ?? null,
      errors: Array.isArray(d.errors) ? d.errors : [],
      warnings: Array.isArray(d.warnings) ? d.warnings : [],
      finishedAt: done ? Date.now() : null,
    });
    if (!done) schedulePoll();
  } catch {
    schedulePoll();
  }
}

export async function startPublish(message: string): Promise<void> {
  hydrate();
  if (state.phase === "starting" || state.phase === "running") return;
  setState({ ...idle, phase: "starting", since: Date.now(), currentStep: "Disparando GitHub Actions" });
  try {
    const res = await fetch("/api/editor/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-editor-password": editorPassword() },
      body: JSON.stringify({ message }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.alreadyRunning) {
      setState({ phase: "running", runId: data.runId ?? null, currentStep: "Siguiendo la publicación en curso" });
      schedulePoll(0);
      return;
    }
    if (!res.ok) {
      setState({
        phase: "error",
        errors: [data.error || "No se pudo iniciar la publicación"],
        finishedAt: Date.now(),
      });
      return;
    }
    setState({
      phase: "running",
      runId: data.runId ?? null,
      since: data.dispatchedAt ?? state.since,
      currentStep: "En cola en GitHub Actions",
    });
    schedulePoll();
  } catch (e) {
    setState({
      phase: "error",
      errors: [e instanceof Error ? e.message : "Error de red al publicar"],
      finishedAt: Date.now(),
    });
  }
}

export function dismissPublishStatus() {
  if (state.phase === "running" || state.phase === "starting") return;
  setState(idle);
}

export function publishRunUrl(runId: number | null): string | null {
  return runId ? `${GITHUB_ACTIONS_RUNS}${Math.trunc(runId)}` : null;
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePublishStatus(): PublishState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => idle
  );
}
