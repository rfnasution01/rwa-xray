"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const easeOut = [0.2, 0.75, 0.25, 1] as const;

export function MotionStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.09, delayChildren: 0.04 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: easeOut },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionFloat({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96, x: 24 }}
      animate={
        reduceMotion
          ? undefined
          : {
              opacity: 1,
              scale: [1, 1.006, 1],
              x: 0,
              y: [0, -9, 0],
            }
      }
      transition={{
        opacity: { duration: 1, ease: easeOut },
        x: { duration: 1, ease: easeOut },
        scale: { duration: 7, repeat: Infinity, ease: "easeInOut" },
        y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionArticle({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: easeOut }}
    >
      {children}
    </motion.article>
  );
}
