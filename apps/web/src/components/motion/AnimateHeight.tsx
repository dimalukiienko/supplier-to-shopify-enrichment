"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Animates a region's height + opacity when its content swaps (keyed by `id`),
 * e.g. FieldEditable toggling between display and edit modes, or expanding a
 * clamped description. Falls back to an instant swap under reduced motion.
 */
export function AnimateHeight({
  id,
  children,
  className,
}: {
  /** Changing this key triggers the enter/exit transition. */
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={id}
        className={className}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
