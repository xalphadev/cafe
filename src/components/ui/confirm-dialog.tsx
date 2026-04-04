"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก",
  variant = "primary",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl w-[calc(100%-2rem)] max-w-sm p-5 gap-0"
      >
        <DialogHeader className="gap-1.5 mb-5">
          <DialogTitle className="text-base font-bold pr-4">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm">{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Buttons — plain flex row, no negative margins */}
        <div className="flex gap-2">
          <button
            className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 active:scale-[0.97] transition-transform"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white active:scale-[0.97] transition-transform"
            style={
              variant === "danger"
                ? { background: "oklch(0.55 0.22 25)" }
                : { background: "linear-gradient(160deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)" }
            }
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
