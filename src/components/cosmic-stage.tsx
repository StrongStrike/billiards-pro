"use client";

import { motion, useReducedMotion } from "motion/react";

export function CosmicStage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="ambient-grid" />
      <div className="ambient-vignette" />
      <div className="ambient-noise" />

      <motion.div
        className="ambient-orb ambient-orb--cyan"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, 48, -24, 0],
                y: [0, -30, 24, 0],
                scale: [1, 1.08, 0.96, 1],
                opacity: [0.34, 0.55, 0.38, 0.34],
              }
        }
        transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-orb ambient-orb--green"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -56, 30, 0],
                y: [0, 26, -18, 0],
                scale: [1, 1.1, 0.94, 1],
                opacity: [0.26, 0.44, 0.28, 0.26],
              }
        }
        transition={{ duration: 26, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-orb ambient-orb--amber"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, 34, -18, 0],
                y: [0, 20, -28, 0],
                scale: [1, 1.06, 0.97, 1],
                opacity: [0.18, 0.26, 0.2, 0.18],
              }
        }
        transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <motion.div
        className="ambient-beam ambient-beam--left"
        animate={reduceMotion ? undefined : { opacity: [0.3, 0.58, 0.34], x: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-beam ambient-beam--right"
        animate={reduceMotion ? undefined : { opacity: [0.2, 0.42, 0.24], x: [0, -14, 0] }}
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </div>
  );
}
