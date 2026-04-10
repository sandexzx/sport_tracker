import { useState, useEffect, useRef, useCallback } from 'react';
import './tooltip.css';

export default function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  const [flipBottom, setFlipBottom] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setFlipBottom(rect.top < 120);
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') close();
    };
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) close();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('pointerdown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('pointerdown', handleClick);
    };
  }, [open, close]);

  return (
    <span className="tooltip-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="tooltip-trigger"
        onClick={toggle}
        ref={triggerRef}
        aria-label="Подсказка"
      >
        ℹ️
      </button>
      {open && (
        <div className={`tooltip-popover${flipBottom ? ' tooltip-popover--bottom' : ''}`}>
          <button type="button" className="tooltip-close" onClick={close} aria-label="Закрыть">
            ×
          </button>
          <span style={{ paddingRight: 16 }}>{text}</span>
        </div>
      )}
    </span>
  );
}
