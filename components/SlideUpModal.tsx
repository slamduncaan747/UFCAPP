'use client';

import { useEffect, useRef, useState } from 'react';

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightClass?: string;
}

const SNAP_TRANSITION = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

export default function SlideUpModal({
  isOpen,
  onClose,
  children,
  heightClass = 'h-[80vh]',
}: SlideUpModalProps) {
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Keep the sheet mounted during the closing animation so it can slide away.
  const [render, setRender] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  // Handle swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0s';
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    currentY.current = e.touches[0].clientY;
    const raw = currentY.current - startY.current;
    // Allow a little rubber-band resistance when dragging upward past the top.
    const delta = raw >= 0 ? raw : raw * 0.25;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
  };
  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!sheetRef.current) return;
    const delta = currentY.current - startY.current;
    if (delta > 60) {
      onClose();
    } else {
      sheetRef.current.style.transition = SNAP_TRANSITION;
      sheetRef.current.style.transform = 'translateY(0)';
    }
  };

  // Drive mount/unmount + exit animation off the isOpen prop.
  useEffect(() => {
    if (isOpen) {
      setRender(true);
      setClosing(false);
    } else if (render) {
      setClosing(true);
      const t = setTimeout(() => setRender(false), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll + close on Escape while open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 modal-backdrop ${closing ? 'modal-backdrop-out' : ''}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`relative ${heightClass} bg-[#050507] border-t-2 border-x-2 border-zinc-800 rounded-t-[32px] shadow-2xl overflow-y-auto no-scrollbar ${closing ? 'modal-slide-down' : 'modal-slide-up'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag notch */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-[#050507]">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}
