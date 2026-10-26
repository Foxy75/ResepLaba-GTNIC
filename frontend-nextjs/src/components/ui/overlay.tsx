"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/primitives";

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () =>
      Array.from(node.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );
    const first = items()[0];
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const index = list.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        list[list.length - 1].focus();
      } else if (!event.shiftKey && index === list.length - 1) {
        event.preventDefault();
        list[0].focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [active, onClose, ref]);
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-sheet p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-ink-soft">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-ink-soft transition duration-200 hover:bg-paper active:scale-[.98]"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} block>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            block
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-ink-soft">{description}</p>
    </Sheet>
  );
}
