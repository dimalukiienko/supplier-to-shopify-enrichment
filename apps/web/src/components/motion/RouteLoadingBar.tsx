"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useNavigationLoading } from "@/lib/navigation-loading-store";

/**
 * Top-of-viewport indeterminate progress bar shown during client navigation.
 * Reads the shared navigation-loading store (driven by TrackedLink) and
 * replaces the old `.route-loading-bar` CSS animation with Framer Motion.
 */
export function RouteLoadingBar() {
  const { pending } = useNavigationLoading();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          <motion.div
            className="bg-primary h-full w-2/5"
            initial={{ x: "-100%" }}
            animate={reduce ? { x: "150%" } : { x: ["-100%", "265%"] }}
            transition={
              reduce
                ? { duration: 0.4 }
                : { duration: 1.1, ease: "easeInOut", repeat: Infinity }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
