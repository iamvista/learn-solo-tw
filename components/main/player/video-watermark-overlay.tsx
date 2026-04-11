"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  buildVideoWatermarkLines,
  type VideoWatermarkPayload,
} from "@/lib/video-watermark";

interface VideoWatermarkOverlayProps {
  watermark?: VideoWatermarkPayload;
  containerRef: RefObject<HTMLElement | null>;
  onTamper?: (reason: string) => void;
}

type AnchorPosition = {
  top: string;
  left: string;
};

const STANDARD_POSITIONS: AnchorPosition[] = [
  { top: "12%", left: "8%" },
  { top: "16%", left: "58%" },
  { top: "38%", left: "10%" },
  { top: "42%", left: "56%" },
  { top: "64%", left: "12%" },
  { top: "68%", left: "54%" },
];

const AGGRESSIVE_POSITIONS: AnchorPosition[] = [
  { top: "10%", left: "10%" },
  { top: "16%", left: "60%" },
  { top: "32%", left: "24%" },
  { top: "38%", left: "50%" },
  { top: "54%", left: "18%" },
  { top: "58%", left: "58%" },
  { top: "70%", left: "12%" },
  { top: "72%", left: "50%" },
];

const TAMPER_CHECK_INTERVAL_MS = 2000;
const MIN_VISIBLE_RATIO = 0.35;
const TAMPER_GRACE_PERIOD_MS = 5000;
const ARM_GRACE_PERIOD_MS = 1500;
const MUTATION_CHECK_DEBOUNCE_MS = 250;

type WatermarkCheckLog = {
  status: "ok" | "missing" | "detached" | "hidden";
  reason?: string;
  armed: boolean;
  invisibleForMs: number;
  intersectionRatio?: number;
  opacity?: number;
  zIndex?: string;
  width?: number;
  height?: number;
  display?: string;
  visibility?: string;
  contentVisibility?: string;
  transform?: string;
  filter?: string;
  mixBlendMode?: string;
};

function getFontClass(textSize: VideoWatermarkPayload["textSize"]): string {
  if (textSize === "SM") return "text-[10px] sm:text-xs";
  if (textSize === "LG") return "text-sm sm:text-base";
  return "text-xs sm:text-sm";
}

function getIntersectionRatio(
  overlayRect: DOMRect,
  containerRect: DOMRect
): number {
  const overlapWidth =
    Math.min(overlayRect.right, containerRect.right) -
    Math.max(overlayRect.left, containerRect.left);
  const overlapHeight =
    Math.min(overlayRect.bottom, containerRect.bottom) -
    Math.max(overlayRect.top, containerRect.top);

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return 0;
  }

  const overlapArea = overlapWidth * overlapHeight;
  const overlayArea = overlayRect.width * overlayRect.height;

  if (overlayArea <= 0) {
    return 0;
  }

  return overlapArea / overlayArea;
}

export function VideoWatermarkOverlay({
  watermark,
  containerRef,
  onTamper,
}: VideoWatermarkOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [positionIndex, setPositionIndex] = useState(0);
  const [seedOffset, setSeedOffset] = useState(0);
  const tamperTriggeredRef = useRef(false);
  const invisibleSinceRef = useRef<number | null>(null);
  const protectionArmedRef = useRef(false);
  const overlayPresenceSinceRef = useRef<number | null>(null);

  useEffect(() => {
    setSeedOffset(Math.floor(Math.random() * 10_000));
  }, []);

  useEffect(() => {
    if (!watermark?.enabled || !watermark.showTimestamp) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimestamp(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [watermark?.enabled, watermark?.showTimestamp]);

  useEffect(() => {
    if (!watermark?.enabled) {
      setPositionIndex(0);
      return;
    }

    const positions =
      watermark.movementMode === "AGGRESSIVE"
        ? AGGRESSIVE_POSITIONS
        : STANDARD_POSITIONS;
    setPositionIndex(seedOffset % positions.length);

    const interval = window.setInterval(() => {
      setPositionIndex((currentIndex) => {
        const stepBase = watermark.movementMode === "AGGRESSIVE" ? 3 : 2;
        const nextIndex =
          (currentIndex + stepBase + (seedOffset % 2)) % positions.length;
        return nextIndex === currentIndex
          ? (currentIndex + 1) % positions.length
          : nextIndex;
      });
    }, (watermark.moveIntervalSec || 12) * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    seedOffset,
    watermark?.enabled,
    watermark?.moveIntervalSec,
    watermark?.movementMode,
  ]);

  useEffect(() => {
    tamperTriggeredRef.current = false;
    invisibleSinceRef.current = null;
    protectionArmedRef.current = false;
    overlayPresenceSinceRef.current = null;
  }, [watermark?.enabled, watermark?.tamperPauseEnabled]);

  useEffect(() => {
    if (!watermark?.enabled || !watermark.tamperPauseEnabled) {
      return;
    }

    const logCheck = (payload: WatermarkCheckLog) => {
      console.info("[watermark-check]", {
        ...payload,
        checkedAt: new Date().toISOString(),
      });
    };

    const confirmTamperIfNeeded = (reason: string) => {
      const now = Date.now();

      if (invisibleSinceRef.current === null) {
        invisibleSinceRef.current = now;
        return;
      }

      if (now - invisibleSinceRef.current < TAMPER_GRACE_PERIOD_MS) {
        return;
      }

      tamperTriggeredRef.current = true;
      onTamper?.(reason);
    };

    const resetTamperWindow = () => {
      invisibleSinceRef.current = null;
    };

    const confirmProtectionArmedIfNeeded = () => {
      const now = Date.now();

      if (protectionArmedRef.current) {
        return true;
      }

      if (overlayPresenceSinceRef.current === null) {
        overlayPresenceSinceRef.current = now;
        return false;
      }

      if (now - overlayPresenceSinceRef.current < ARM_GRACE_PERIOD_MS) {
        return false;
      }

      protectionArmedRef.current = true;
      return true;
    };

    const resetProtectionPresence = () => {
      overlayPresenceSinceRef.current = null;
    };

    const checkTamper = () => {
      if (tamperTriggeredRef.current) return;

      const overlay = overlayRef.current;
      const container = containerRef.current;
      const invisibleForMs =
        invisibleSinceRef.current === null
          ? 0
          : Math.max(0, Date.now() - invisibleSinceRef.current);

      if (!overlay || !container) {
        resetProtectionPresence();
        logCheck({
          status: "missing",
          reason: "overlay_missing",
          armed: protectionArmedRef.current,
          invisibleForMs,
        });
        if (!protectionArmedRef.current) return;
        confirmTamperIfNeeded("overlay_missing");
        return;
      }

      if (!overlay.isConnected || !container.contains(overlay)) {
        resetProtectionPresence();
        logCheck({
          status: "detached",
          reason: "overlay_detached",
          armed: protectionArmedRef.current,
          invisibleForMs,
        });
        if (!protectionArmedRef.current) return;
        confirmTamperIfNeeded("overlay_detached");
        return;
      }

      confirmProtectionArmedIfNeeded();

      const style = window.getComputedStyle(overlay);
      const rect = overlay.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const intersectionRatio = getIntersectionRatio(rect, containerRect);
      const hasInvisibleTransform =
        style.transform.includes("matrix(0") ||
        style.transform.includes("scale(0");
      const hasConcealingEffects =
        style.clipPath !== "none" ||
        style.maskImage !== "none" ||
        style.filter.includes("opacity(0") ||
        style.filter.includes("brightness(0") ||
        style.mixBlendMode !== "normal";

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) < 0.01 ||
        style.contentVisibility === "hidden" ||
        style.clip === "rect(0px, 0px, 0px, 0px)" ||
        Number(style.zIndex) < 20 ||
        rect.width < 20 ||
        rect.height < 10 ||
        intersectionRatio < MIN_VISIBLE_RATIO ||
        hasInvisibleTransform ||
        hasConcealingEffects
      ) {
        logCheck({
          status: "hidden",
          reason: "overlay_hidden",
          armed: protectionArmedRef.current,
          invisibleForMs,
          intersectionRatio: Number(intersectionRatio.toFixed(3)),
          opacity: Number(style.opacity),
          zIndex: style.zIndex,
          width: Number(rect.width.toFixed(1)),
          height: Number(rect.height.toFixed(1)),
          display: style.display,
          visibility: style.visibility,
          contentVisibility: style.contentVisibility,
          transform: style.transform,
          filter: style.filter,
          mixBlendMode: style.mixBlendMode,
        });
        if (!protectionArmedRef.current) {
          return;
        }
        confirmTamperIfNeeded("overlay_hidden");
        return;
      }

      resetTamperWindow();
      logCheck({
        status: "ok",
        armed: protectionArmedRef.current,
        invisibleForMs: 0,
        intersectionRatio: Number(intersectionRatio.toFixed(3)),
        opacity: Number(style.opacity),
        zIndex: style.zIndex,
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
        display: style.display,
        visibility: style.visibility,
        contentVisibility: style.contentVisibility,
        transform: style.transform,
        filter: style.filter,
        mixBlendMode: style.mixBlendMode,
      });
    };

    let mutationCheckTimer: number | null = null;
    const scheduleMutationCheck = () => {
      if (mutationCheckTimer !== null) {
        return;
      }

      mutationCheckTimer = window.setTimeout(() => {
        mutationCheckTimer = null;
        checkTamper();
      }, MUTATION_CHECK_DEBOUNCE_MS);
    };

    const observer = new MutationObserver(() => {
      scheduleMutationCheck();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    const interval = window.setInterval(checkTamper, TAMPER_CHECK_INTERVAL_MS);

    return () => {
      observer.disconnect();
      if (mutationCheckTimer !== null) {
        window.clearTimeout(mutationCheckTimer);
      }
      window.clearInterval(interval);
    };
  }, [
    containerRef,
    onTamper,
    watermark?.enabled,
    watermark?.tamperPauseEnabled,
  ]);

  if (!watermark?.enabled) {
    return null;
  }

  const positions =
    watermark.movementMode === "AGGRESSIVE"
      ? AGGRESSIVE_POSITIONS
      : STANDARD_POSITIONS;
  const activePosition = positions[positionIndex % positions.length];
  const lines = buildVideoWatermarkLines(watermark, timestamp);

  return (
    <motion.div
      ref={overlayRef}
      className="pointer-events-none absolute z-30 max-w-[72%] rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-white shadow-2xl backdrop-blur-sm sm:px-4"
      animate={{
        top: activePosition.top,
        left: activePosition.left,
      }}
      transition={{
        duration: watermark.movementMode === "AGGRESSIVE" ? 1.4 : 1.8,
        ease: "easeInOut",
      }}
      style={{
        opacity: watermark.opacityPercent / 100,
      }}
      aria-hidden="true"
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          className={`${getFontClass(watermark.textSize)} font-medium uppercase tracking-[0.12em] text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]`}
        >
          {line}
        </div>
      ))}
    </motion.div>
  );
}
