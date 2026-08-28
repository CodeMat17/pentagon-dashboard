"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { CheckIcon, ImagePlusIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/dashboard/page-header";
import { useViewer } from "@/components/dashboard/shell";
import { EmptyState, ListSkeleton } from "@/components/dashboard/list";
import { cleanError } from "@/components/dashboard/record-form";
import { useImageUpload, type StoredImage } from "@/components/dashboard/image-input";
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
import { atLeast } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * The gallery is the one bulk screen: photographs arrive a dozen at a time, so
 * uploading, categorising and deleting all work on a selection rather than a row.
 */

const CATEGORIES = ["Hotel", "Rooms", "Dining", "Pool & Spa", "Events", "Surroundings"];

export default function GalleryPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const images = useQuery(api.gallery.list, {});
  const addMany = useMutation(api.gallery.addMany);
  const update = useMutation(api.gallery.update);
  const removeMany = useMutation(api.gallery.removeMany);

  const { upload, uploading } = useImageUpload();
  const fileInput = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Set<Id<"galleryImages">>>(new Set());
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);

  const shown = useMemo(() => {
    const all = images ?? [];
    return filter === "All" ? all : all.filter((img) => img.category === filter);
  }, [images, filter]);

  async function handleFiles(files: File[]) {
    const uploaded: StoredImage[] = [];
    for (const file of files) {
      const image = await upload(file, "");
      if (image) uploaded.push(image);
    }
    if (!uploaded.length) return;

    try {
      await addMany({
        images: uploaded.map((image) => ({
          image,
          category: uploadCategory,
          tall: false,
        })),
      });
      toast.success(
        `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} added to ${uploadCategory}. Add alt text below.`,
      );
    } catch (error) {
      toast.error(cleanError(error));
    }
  }

  function toggle(id: Id<"galleryImages">) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const missingAlt = (images ?? []).filter((img) => !img.image.alt.trim()).length;

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Every photograph on /gallery, stored in Convex. Deleting one here removes the file too."
        action={
          canEdit ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-44">
                <Label htmlFor="upload-category" className="text-xs">
                  Upload into
                </Label>
                <Select
                  items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  value={uploadCategory}
                  onValueChange={(value) => setUploadCategory(value as string)}
                >
                  <SelectTrigger id="upload-category" className="mt-1 h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <ImagePlusIcon />
                )}
                Upload images
              </Button>
            </div>
          ) : undefined
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          await handleFiles(files);
        }}
      />

      {missingAlt > 0 && (
        <p className="mb-4 rounded-xl border border-brand/40 bg-brand-muted/40 px-4 py-3 text-sm">
          {missingAlt} image{missingAlt === 1 ? " has" : "s have"} no alt text. Screen
          readers — and search engines — need it.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["All", ...CATEGORIES].map((category) => (
          <Button
            key={category}
            variant={filter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(category)}
          >
            {category}
          </Button>
        ))}

        {selected.size > 0 && canEdit && (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" size="sm" className="ml-auto" />}
            >
              <Trash2Icon /> Delete {selected.size} selected
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.size} images?</AlertDialogTitle>
                <AlertDialogDescription>
                  The files are removed from Convex storage permanently. Any page
                  still pointing at them will show a gap.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep them</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await removeMany({ ids: [...selected] });
                      toast.success("Images deleted.");
                      setSelected(new Set());
                    } catch (error) {
                      toast.error(cleanError(error));
                    }
                  }}
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {images === undefined ? (
        <ListSkeleton rows={3} />
      ) : shown.length === 0 ? (
        <EmptyState
          title="No images here"
          description="Upload photographs, or import the original gallery from Settings."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => {
            const isSelected = selected.has(item._id);
            return (
              <li
                key={item._id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-card",
                  isSelected ? "border-brand ring-2 ring-brand/30" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => canEdit && toggle(item._id)}
                  className="relative block aspect-4/3 w-full bg-muted"
                  aria-pressed={isSelected}
                  aria-label={`Select ${item.image.alt || "image"}`}
                >
                  <Image
                    src={item.image.url}
                    alt={item.image.alt}
                    fill
                    sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 90vw"
                    className="object-cover"
                  />
                  {isSelected && (
                    <span className="absolute top-2 right-2 rounded-full bg-brand p-1 text-brand-foreground">
                      <CheckIcon className="size-4" />
                    </span>
                  )}
                </button>

                <div className="space-y-2 p-3">
                  <Input
                    defaultValue={item.image.alt}
                    placeholder="Alt text — describe the photo"
                    disabled={!canEdit}
                    onBlur={async (event) => {
                      const alt = event.target.value;
                      if (alt === item.image.alt) return;
                      try {
                        await update({
                          id: item._id,
                          alt,
                          category: item.category,
                          tall: item.tall,
                        });
                      } catch (error) {
                        toast.error(cleanError(error));
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                      value={item.category}
                      onValueChange={async (value) => {
                        try {
                          await update({
                            id: item._id,
                            alt: item.image.alt,
                            category: value as string,
                            tall: item.tall,
                          });
                        } catch (error) {
                          toast.error(cleanError(error));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 flex-1" disabled={!canEdit}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      Tall
                      <Switch
                        checked={item.tall}
                        disabled={!canEdit}
                        onCheckedChange={async (tall) => {
                          try {
                            await update({
                              id: item._id,
                              alt: item.image.alt,
                              category: item.category,
                              tall,
                            });
                          } catch (error) {
                            toast.error(cleanError(error));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
