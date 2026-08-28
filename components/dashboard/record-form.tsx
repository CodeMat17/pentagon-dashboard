"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircleIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageInput, ImagesInput, type StoredImage } from "@/components/dashboard/image-input";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One declarative form engine for every content type.
 *
 * Each screen describes its fields once; this renders them, keeps the draft in
 * local state, and hands the finished record back on submit. It is deliberately
 * untyped at the value level (`Record<string, unknown>`) — the Convex validators
 * are the contract, and duplicating them in TypeScript here would only let the
 * two drift.
 */

export type Values = Record<string, unknown>;

interface Base {
  name: string;
  label: string;
  hint?: string;
  /** Half-width by default; `wide` spans both columns. */
  wide?: boolean;
}

export type Field =
  | (Base & { kind: "text" | "slug"; placeholder?: string })
  | (Base & { kind: "textarea"; rows?: number; placeholder?: string })
  | (Base & { kind: "number" | "currency" | "percent"; step?: number })
  | (Base & { kind: "switch"; onLabel?: string })
  | (Base & { kind: "select"; options: readonly string[] })
  | (Base & { kind: "list"; placeholder?: string })
  | (Base & { kind: "paragraphs"; rows?: number })
  | (Base & { kind: "image" })
  | (Base & { kind: "images" })
  | (Base & {
      kind: "objects";
      itemLabel: string;
      blank: Values;
      fields: readonly Field[];
    });

export function RecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitLabel = "Save",
  footnote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: readonly Field[];
  initial: Values;
  onSubmit: (values: Values) => Promise<void>;
  submitLabel?: string;
  footnote?: ReactNode;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);

  /**
   * Re-seed the draft when the dialog is pointed at a different record.
   *
   * Adjusting state during render — rather than in an effect — is the documented
   * pattern for "derive from props, but keep it editable": React discards the
   * in-progress render and restarts with the new values, so the form never
   * flashes the previous record's contents.
   */
  const [seed, setSeed] = useState(initial);
  if (seed !== initial) {
    setSeed(initial);
    setValues(initial);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      // Convex throws readable messages; surface them rather than a generic one.
      toast.error(cleanError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <FieldGrid fields={fields} values={values} onChange={setValues} />

          {footnote ? (
            <p className="text-xs text-muted-foreground">{footnote}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircleIcon className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FieldGrid({
  fields,
  values,
  onChange,
}: {
  fields: readonly Field[];
  values: Values;
  onChange: (values: Values) => void;
}) {
  const set = (name: string, value: unknown) => onChange({ ...values, [name]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.name}
          className={cn(
            "space-y-2",
            (field.wide ||
              field.kind === "textarea" ||
              field.kind === "paragraphs" ||
              field.kind === "list" ||
              field.kind === "images" ||
              field.kind === "objects") &&
              "sm:col-span-2",
          )}
        >
          <FieldControl field={field} values={values} value={values[field.name]} set={set} />
          {field.hint ? (
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  values,
  set,
}: {
  field: Field;
  value: unknown;
  values: Values;
  set: (name: string, value: unknown) => void;
}) {
  const id = `field-${field.name}`;

  switch (field.kind) {
    case "text":
    case "slug":
      return (
        <>
          <Label htmlFor={id}>{field.label}</Label>
          <Input
            id={id}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(event) =>
              set(
                field.name,
                field.kind === "slug" ? slugify(event.target.value) : event.target.value,
              )
            }
            onBlur={
              field.kind === "slug"
                ? () => set(field.name, slugify((value as string) ?? ""))
                : undefined
            }
          />
        </>
      );

    case "textarea":
      return (
        <>
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea
            id={id}
            rows={field.rows ?? 3}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(event) => set(field.name, event.target.value)}
          />
        </>
      );

    case "number":
    case "currency":
    case "percent":
      return (
        <>
          <Label htmlFor={id}>
            {field.label}
            {field.kind === "currency" && (
              <span className="text-muted-foreground"> (₦)</span>
            )}
          </Label>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step={field.step ?? (field.kind === "percent" ? 0.005 : 1)}
            className="numeric"
            value={Number.isFinite(value as number) ? String(value) : ""}
            onChange={(event) =>
              set(field.name, event.target.value === "" ? 0 : Number(event.target.value))
            }
          />
        </>
      );

    case "switch":
      return (
        <label
          htmlFor={id}
          className="flex h-full items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
        >
          <span className="text-sm font-semibold">{field.label}</span>
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => set(field.name, checked)}
          />
        </label>
      );

    case "select": {
      const options = field.options.map((option) => ({ value: option, label: option }));
      return (
        <>
          <Label htmlFor={id}>{field.label}</Label>
          <Select
            items={options}
            value={(value as string) ?? ""}
            onValueChange={(next) => set(field.name, next as string)}
          >
            <SelectTrigger id={id} className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      );
    }

    case "list":
      return (
        <ListField
          label={field.label}
          placeholder={field.placeholder}
          value={(value as string[]) ?? []}
          onChange={(next) => set(field.name, next)}
        />
      );

    case "paragraphs":
      return (
        <>
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea
            id={id}
            rows={field.rows ?? 8}
            value={((value as string[]) ?? []).join("\n\n")}
            placeholder="One paragraph per block, separated by a blank line."
            onChange={(event) =>
              set(
                field.name,
                event.target.value
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean),
              )
            }
          />
        </>
      );

    case "image":
      return (
        <ImageInput
          label={field.label}
          value={(value as StoredImage | null) ?? null}
          onChange={(next) => set(field.name, next)}
        />
      );

    case "images":
      return (
        <ImagesInput
          label={field.label}
          value={(value as StoredImage[]) ?? []}
          onChange={(next) => set(field.name, next)}
        />
      );

    case "objects":
      return (
        <ObjectListField
          field={field}
          value={(value as Values[]) ?? []}
          onChange={(next) => set(field.name, next)}
        />
      );
  }

  // Unreachable — every `kind` is handled above.
  void values;
  return null;
}

/* ------------------------------------------------------------- list of text */

function ListField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const entry = draft.trim();
    if (!entry) return;
    if (value.includes(entry)) {
      setDraft("");
      return;
    }
    onChange([...value, entry]);
    setDraft("");
  }

  return (
    <>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder ?? "Type and press Enter"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          <PlusIcon /> Add
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {value.map((entry, index) => (
            <li
              key={entry}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pr-1 pl-3 text-sm"
            >
              {entry}
              <button
                type="button"
                aria-label={`Remove ${entry}`}
                className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ----------------------------------------------------- repeating sub-records */

function ObjectListField({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { kind: "objects" }>;
  value: Values[];
  onChange: (value: Values[]) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>{field.label}</Label>

      {value.map((row, index) => (
        <div key={index} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">
              {field.itemLabel} {index + 1}
            </p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                aria-label="Move up"
                onClick={() => {
                  const next = [...value];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onChange(next);
                }}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                aria-label={`Remove ${field.itemLabel} ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>

          <FieldGrid
            fields={field.fields}
            values={row}
            onChange={(next) => {
              const rows = [...value];
              rows[index] = next;
              onChange(rows);
            }}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...value, { ...field.blank }])}
      >
        <PlusIcon /> Add {field.itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ errors */

/** Convex prefixes thrown errors with call-site noise; show only the message. */
export function cleanError(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong.";
  const match = error.message.match(/Uncaught Error:\s*(.*?)(\n|$)/);
  return (match?.[1] ?? error.message).trim() || "Something went wrong.";
}
