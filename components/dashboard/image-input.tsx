"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { ImagePlusIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface StoredImage {
  storageId: Id<"_storage">;
  url: string;
  alt: string;
}

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploads straight from the browser to Convex storage — the bytes never touch
 * this Next.js server. `files.finalize` then resolves the permanent URL once and
 * hands back the `{ storageId, url, alt }` shape stored on the content row.
 */
export function useImageUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const finalize = useMutation(api.files.finalize);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File, alt = ""): Promise<StoredImage | null> {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} is not an image.`);
      return null;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is over 8 MB — resize it first.`);
      return null;
    }

    setUploading(true);
    try {
      const postUrl = await generateUploadUrl({});
      const response = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`);
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      return await finalize({ storageId, alt });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}

/* ------------------------------------------------------------ single image */

export function ImageInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
}) {
  const { upload, uploading } = useImageUpload();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-border p-3">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image
              src={value.url}
              alt={value.alt || "Selected image"}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={value.alt}
              placeholder="Describe the photo for screen readers"
              onChange={(event) => onChange({ ...value, alt: event.target.value })}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => input.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onChange(null)}
              >
                <Trash2Icon /> Remove
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Removing here deletes the file from storage when you save.
            </p>
          </div>
        </div>
      ) : (
        <DropZone
          uploading={uploading}
          onPick={() => input.current?.click()}
          onFiles={async (files) => {
            const image = await upload(files[0]);
            if (image) onChange(image);
          }}
        />
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const image = await upload(file, value?.alt ?? "");
          if (image) onChange(image);
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------- image gallery */

export function ImagesInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StoredImage[];
  onChange: (images: StoredImage[]) => void;
}) {
  const { upload, uploading } = useImageUpload();
  const input = useRef<HTMLInputElement>(null);

  async function addFiles(files: File[]) {
    const uploaded: StoredImage[] = [];
    for (const file of files) {
      const image = await upload(file);
      if (image) uploaded.push(image);
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  }

  return (
    <div className="space-y-2">
      <Label>
        {label} <span className="text-muted-foreground">({value.length})</span>
      </Label>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((img, index) => (
            <li
              key={img.storageId}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-2"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={img.url}
                  alt={img.alt || `Image ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <Input
                className="min-w-40 flex-1"
                value={img.alt}
                placeholder="Alt text"
                onChange={(event) => {
                  const next = [...value];
                  next[index] = { ...img, alt: event.target.value };
                  onChange(next);
                }}
              />
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
                  variant="ghost"
                  size="sm"
                  disabled={index === value.length - 1}
                  aria-label="Move down"
                  onClick={() => {
                    const next = [...value];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    onChange(next);
                  }}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  aria-label="Remove image"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DropZone
        uploading={uploading}
        multiple
        onPick={() => input.current?.click()}
        onFiles={addFiles}
      />

      <p className="text-xs text-muted-foreground">
        The first image is the one used on cards and social previews. Images you
        remove are deleted from storage when you save.
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          await addFiles(files);
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- drop zone */

function DropZone({
  uploading,
  multiple = false,
  onPick,
  onFiles,
}: {
  uploading: boolean;
  multiple?: boolean;
  onPick: () => void;
  onFiles: (files: File[]) => void | Promise<void>;
}) {
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={uploading}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const files = Array.from(event.dataTransfer.files);
        void onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground transition-colors",
        over && "border-brand bg-brand-muted/40 text-foreground",
        uploading && "opacity-70",
      )}
    >
      {uploading ? (
        <>
          <LoaderCircleIcon className="size-5 animate-spin text-brand" aria-hidden />
          Uploading…
        </>
      ) : (
        <>
          <ImagePlusIcon className="size-5" aria-hidden />
          Drop {multiple ? "images" : "an image"} here, or click to choose
          <span className="text-xs">JPEG, PNG, WebP or AVIF · up to 8 MB each</span>
        </>
      )}
    </button>
  );
}
