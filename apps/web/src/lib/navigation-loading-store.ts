"use client";

import { useSyncExternalStore } from "react";

type NavigationLoadingState = {
  pending: boolean;
  href: string | null;
};

type Listener = () => void;

let state: NavigationLoadingState = {
  pending: false,
  href: null,
};

const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function startNavigationLoading(href: string) {
  state = {
    pending: true,
    href,
  };
  emit();
}

export function clearNavigationLoading() {
  if (!state.pending && state.href == null) return;

  state = {
    pending: false,
    href: null,
  };
  emit();
}

export function useNavigationLoading() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
