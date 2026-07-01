'use client';

import { useEffect, useRef, useState } from 'react';

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightClass?: string;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const DURATION = 320;

/**
 * A polished bottom-sheet.
 *
 * Drag-to-dismiss only engages when the inner content is scrolled to the very
 * top and the finger moves downward — so scrolling a long list never yanks the
 * sheet around or accidentally closes it. Enter / exit / drag are all driven by
 * a single inline transform to keep them perfectly in sync (no keyframe vs.
 * inline-style fighting), and the backdrop fades progressively as you drag.
 */
export default function SlideUpModal({
  isOpen,
  onClose,
  children,
  heightClass = 'h-[80dvh]',
}: SlideUpModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Keep mounted through the closing animation.
  const [render, setRender] = useState(isOpen);

  const drag = useRef({ startY: 0, lastY: 0, active: false, dragging: false });

  const reduced = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const moveSheet = (y: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate && !reduced() ? `transform ${DURATION}ms ${EASE}` : 'none';
    el.style.transform = `translateY(${y}px)`;
  };
  const fadeBackdrop = (opacity: number, animate: boolean) => {
    const el = backdropRef.current;
    if (!el) return;
    el.style.transition = animate && !reduced() ? `opacity ${DURATION}ms ease` : 'none';
    el.style.opacity = String(opacity);
  };

  // Mount as soon as we're asked to open.
  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  // Drive the enter / exit animation off the sheet's own height.
  useEffect(() => {
    if (!render) return;
    const height = sheetRef.current?.offsetHeight ?? window.innerHeight;

    if (isOpen) {
      // Start fully off-screen, then spring in on the next frame.
      moveSheet(height, false);
      fadeBackdrop(0, false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          moveSheet(0, true);
          fadeBackdrop(1, true);
        });
      });
      return () => cancelAnimationFrame(id);
    }

    // Closing: slide down + fade out, then unmount.
    moveSheet(height, true);
    fadeBackdrop(0, true);
    const t = setTimeout(() => setRender(false), reduced() ? 0 : DURATION);
    return () => clearTimeout(t);
  }, [isOpen, render]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0;
    const y = e.touches[0].clientY;
    drag.current = { startY: y, lastY: y, active: atTop, dragging: false };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const d = drag.current;
    if (!d.active) return; // not started at top → let the list scroll natively
    const y = e.touches[0].clientY;
    d.lastY = y;
    const delta = y - d.startY;

    if (delta <= 0) {
      // Reversing upward: hand the gesture back to native scrolling.
      if (d.dragging) {
        moveSheet(0, false);
        fadeBackdrop(1, false);
      }
      d.active = false;
      d.dragging = false;
      return;
    }

    d.dragging = true;
    const height = sheetRef.current?.offsetHeight ?? 1;
    moveSheet(delta, false);
    fadeBackdrop(Math.max(0, 1 - (delta / height) * 1.4), false);
  };

  const handleTouchEnd = () => {
    const d = drag.current;
    if (!d.dragging) {
      d.active = false;
      return;
    }
    d.active = false;
    d.dragging = false;
    const delta = d.lastY - d.startY;
    const height = sheetRef.current?.offsetHeight ?? 1;
    if (delta > Math.min(140, height * 0.28)) {
      onClose();
    } else {
      moveSheet(0, true);
      fadeBackdrop(1, true);
    }
  };

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="absolute inset-0 modal-backdrop"
        style={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{ transform: 'translateY(100%)' }}
        className={`relative w-full max-w-md mx-auto ${heightClass} bg-[#050507] border-t-2 border-x-2 border-zinc-800 rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.6)] flex flex-col will-change-transform`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle — always grabbable, with an always-visible close button */}
        <div className="flex-shrink-0 relative flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-zinc-700 rounded-full" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute -top-0.5 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 active:scale-90 transition-all duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}
