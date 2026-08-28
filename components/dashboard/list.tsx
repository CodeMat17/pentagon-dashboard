"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanError } from "@/components/dashboard/record-form";
import { cn } from "@/lib/utils";

/** A card in a vertical list of records. */
export function RowCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      {children}
    </li>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <ul className="space-y-3">{children}</ul>;
}

/** Shown while a Convex query is still `undefined`. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <p className="font-bold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

/**
 * Delete with a confirmation step and a spinner, used by every list screen.
 * The warning text names what else goes with the row — stored images, mostly —
 * because that deletion is permanent.
 */
export function DeleteButton({
  label,
  description,
  onConfirm,
  size = "sm",
}: {
  label: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  size?: "sm" | "default";
}) {
  const [busy, setBusy] = useState(false);

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size={size} aria-label={`Delete ${label}`} />
        }
      >
        {busy ? <LoaderCircleIcon className="animate-spin" /> : <Trash2Icon />}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                toast.success(`${label} deleted.`);
              } catch (error) {
                toast.error(cleanError(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
