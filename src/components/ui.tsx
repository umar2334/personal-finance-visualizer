import { useEffect, useRef, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import { usePrefs } from "@/context/PrefsContext";

/** Native <dialog> gives focus trapping, Esc to close and a top layer for free. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = usePrefs();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-surface p-0 text-ink ${wide ? "max-w-2xl" : "max-w-md"}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
        <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
        <button type="button" className="btn-icon -me-2" onClick={onClose} aria-label={t("close")}><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = usePrefs();
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, body, children }: { icon: LucideIcon; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon size={22} /></span>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-muted">{body}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/** Numbers stay left-to-right inside Urdu text so "-Rs 1,000" can't get reordered. */
export function Money({ value, className = "", sign }: { value: number; className?: string; sign?: "+" | "-" }) {
  const { money } = usePrefs();
  return <span dir="ltr" className={`inline-block tabular-nums ${className}`}>{sign}{money(value)}</span>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-muted">
      <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function CategoryDot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}
