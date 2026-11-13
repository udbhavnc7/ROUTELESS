import { useEffect, useRef } from 'react'
import { Button } from './Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      className="panel m-auto w-[min(92vw,430px)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-night/65 backdrop:backdrop-blur-[2px]"
    >
      <span
        aria-hidden="true"
        className="block h-1 w-full bg-gradient-to-r from-brand via-brand/60 to-gold/70"
      />
      <div className="p-5 sm:p-6">
        <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-2">
          Confirm change
        </p>
        <h2 className="mt-1 font-display text-[22px] font-semibold leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
