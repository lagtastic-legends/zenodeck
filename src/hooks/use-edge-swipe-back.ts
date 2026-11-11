"use client";

import { useState, useRef, useCallback } from "react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";

export interface UseEdgeSwipeBackOptions {
  enabled?: boolean;
  edgeThreshold?: number; // Max distance from left edge to start gesture (default: 40px)
  commitThreshold?: number; // Distance in px to trigger back (default: 75px)
  onBack?: () => void;
}

export function useEdgeSwipeBack({
  enabled = true,
  edgeThreshold = 40,
  commitThreshold = 75,
  onBack,
}: UseEdgeSwipeBackOptions = {}) {
  const [swipeX, setSwipeX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const haptics = useHaptics();

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isValidEdgeSwipeRef = useRef<boolean>(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return;

      const touch = e.touches[0];
      // Only initiate if touch starts near the left edge of the screen
      if (touch.clientX <= edgeThreshold) {
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        lastXRef.current = touch.clientX;
        lastTimeRef.current = Date.now();
        isValidEdgeSwipeRef.current = true;
        setIsSwiping(true);
        setSwipeX(0);
      } else {
        isValidEdgeSwipeRef.current = false;
      }
    },
    [enabled, edgeThreshold]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isValidEdgeSwipeRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      // Verify horizontal intent
      if (deltaX > 0 && deltaX > deltaY * 1.25) {
        // Apply slight resistance curve
        const dampedX = Math.min(deltaX, 160);
        setSwipeX(dampedX);
        lastXRef.current = touch.clientX;
        lastTimeRef.current = Date.now();
      } else if (deltaY > deltaX && deltaY > 20) {
        // Cancel if user is scrolling vertically
        isValidEdgeSwipeRef.current = false;
        setIsSwiping(false);
        setSwipeX(0);
      }
    },
    []
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isValidEdgeSwipeRef.current) {
        setIsSwiping(false);
        setSwipeX(0);
        return;
      }

      const touch = e.changedTouches[0];
      const totalDeltaX = touch.clientX - startXRef.current;
      const now = Date.now();
      const timeDelta = Math.max(1, now - lastTimeRef.current);
      const velocityX = (touch.clientX - lastXRef.current) / timeDelta;

      // Commit if dragged past threshold or swiped with high velocity
      if (totalDeltaX >= commitThreshold || velocityX > 0.4) {
        void haptics.light();
        if (onBack) {
          onBack();
        } else {
          void useNavStore.getState().handleBack();
        }
      }

      isValidEdgeSwipeRef.current = false;
      setIsSwiping(false);
      setSwipeX(0);
    },
    [commitThreshold, haptics, onBack]
  );

  return {
    swipeX,
    isSwiping,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: () => {
        isValidEdgeSwipeRef.current = false;
        setIsSwiping(false);
        setSwipeX(0);
      },
    },
  };
}
