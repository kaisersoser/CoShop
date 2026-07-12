import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import './Dialog.css';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface DialogProps {
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
  ariaLabel?: string;
  className?: string;
  variant?: 'dialog' | 'sheet' | 'wide';
  initialFocusRef?: RefObject<HTMLElement>;
  closeOnOutsideClick?: boolean;
}

export function Dialog({
  children,
  onClose,
  labelledBy,
  ariaLabel,
  className = '',
  variant = 'dialog',
  initialFocusRef,
  closeOnOutsideClick = true,
}: DialogProps) {
  const surfaceRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert ?? false;
    document.body.classList.add('dialog-open');
    if (appRoot) appRoot.inert = true;

    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef?.current
        ?? surfaceRef.current?.querySelector<HTMLElement>(focusableSelector)
        ?? surfaceRef.current;
      target?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !surfaceRef.current) return;
      const focusable = Array.from(surfaceRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        surfaceRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('dialog-open');
      if (appRoot) appRoot.inert = wasInert;
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [initialFocusRef]);

  return createPortal(
    <div
      className="dialog-overlay"
      onMouseDown={(event) => {
        if (closeOnOutsideClick && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={surfaceRef}
        className={`dialog-surface dialog-surface--${variant} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}
