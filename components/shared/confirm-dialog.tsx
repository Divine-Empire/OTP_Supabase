"use client"

import React, { useState, useCallback } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface ConfirmDialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm?: () => void
  resolve?: (value: boolean) => void
}

/**
 * Enterprise Replacement for synchronous window.confirm().
 *
 * Usage:
 *   const { askConfirm, confirmAsync, confirmDialog } = useConfirmDialog()
 *
 *   // 1) Callback style
 *   askConfirm({ title: "Reject Indent", message: "Are you sure?", confirmText: "Reject" }, () => doReject())
 *
 *   // 2) Promise style
 *   if (!await confirmAsync({ title: "Delete item?", message: "This cannot be undone." })) return
 *
 *   return (
 *     <>
 *       ...
 *       {confirmDialog}
 *     </>
 *   )
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<ConfirmDialogOptions | null>(null)

  const askConfirm = useCallback((options: Omit<ConfirmDialogOptions, "onConfirm">, onConfirm: () => void) => {
    setPending({ ...options, onConfirm })
  }, [])

  const confirmAsync = useCallback(
    (options: Omit<ConfirmDialogOptions, "resolve">) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve })
      }),
    []
  )

  const handleConfirm = () => {
    pending?.onConfirm?.()
    pending?.resolve?.(true)
    setPending(null)
  }

  const handleCancel = () => {
    pending?.resolve?.(false)
    setPending(null)
  }

  const confirmDialog = (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-semibold text-foreground">
            {pending?.title || "Are you sure?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
            {pending?.message || ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={handleCancel} className="h-9 px-4 text-xs font-medium">
            {pending?.cancelText || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={`h-9 px-4 text-xs font-medium ${
              pending?.destructive ?? true
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {pending?.confirmText || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { askConfirm, confirmAsync, confirmDialog }
}
