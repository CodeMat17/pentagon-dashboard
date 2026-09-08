"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import {
  CheckIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/dashboard/page-header";
import { useViewer } from "@/components/dashboard/shell";
import { DeleteButton, EmptyState, ListSkeleton } from "@/components/dashboard/list";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
 * uploading works on a batch. Everything after that is per-image and explicit —
 * each card carries its own Edit and Delete, and the corner checkbox exists only
 * for the bulk delete.
 */

const CATEGORIES = ["Hotel", "Rooms", "Dining", "Pool & Spa", "Events", "Surroundings"];

/** An image already in Convex storage, waiting for its alt text before it is saved. */
interface Staged {
  image: StoredImage;
  category: string;
  tall: boolean;
}

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
  const [staged, setStaged] = useState<Staged[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Id<"galleryImages"> | null>(null);

  const shown = useMemo(() => {
    const all = images ?? [];
    return filter === "All" ? all : all.filter((img) => img.category === filter);
  }, [images, filter]);

  const editingItem = (images ?? []).find((img) => img._id === editing) ?? null;

  /** Upload the files first, then hold them in the dialog so alt text can be typed. */
  async function handleFiles(files: File[]) {
    const uploaded: StoredImage[] = [];
    for (const file of files) {
      const image = await upload(file, "");
      if (image) uploaded.push(image);
    }
    if (!uploaded.length) return;
    setStaged(uploaded.map((image) => ({ image, category: uploadCategory, tall: false })));
  }

  async function saveStaged() {
    if (!staged) return;
    setSaving(true);
    try {
      await addMany({
        images: staged.map(({ image, category, tall }) => ({
          image: { ...image, alt: image.alt.trim() },
          category,
          tall,
        })),
      });
      toast.success(`${staged.length} image${staged.length === 1 ? "" : "s"} added.`);
      setStaged(null);
    } catch (error) {
      toast.error(cleanError(error));
    } finally {
      setSaving(false);
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
                <div className="relative aspect-4/3 w-full bg-muted">
                  <Image
                    src={item.image.url}
                    alt={item.image.alt}
                    fill
                    sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 90vw"
                    className="object-cover"
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => toggle(item._id)}
                      aria-pressed={isSelected}
                      aria-label={`Select ${item.image.alt || "image"} for bulk delete`}
                      className={cn(
                        "absolute top-2 left-2 grid size-7 place-items-center rounded-full border shadow-sm transition",
                        isSelected
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-background/90 text-transparent hover:text-muted-foreground",
                      )}
                    >
                      <CheckIcon className="size-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 p-3">
                  <p
                    className={cn(
                      "line-clamp-2 min-h-10 text-sm",
                      item.image.alt.trim()
                        ? "text-foreground"
                        : "text-muted-foreground italic",
                    )}
                  >
                    {item.image.alt.trim() || "No alt text"}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {item.category}
                    </span>
                    {item.tall && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        Tall
                      </span>
                    )}

                    {canEdit && (
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(item._id)}
                        >
                          <PencilIcon /> Edit
                        </Button>
                        <DeleteButton
                          label="image"
                          description="The file is removed from Convex storage permanently. Any page still pointing at it will show a gap."
                          onConfirm={async () => {
                            await removeMany({ ids: [item._id] });
                            setSelected((current) => {
                              const next = new Set(current);
                              next.delete(item._id);
                              return next;
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------------------------------------ alt text on upload */}
      <Dialog
        open={staged !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setStaged(null);
        }}
      >
        <DialogContent className="max-h-[90svh] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {staged?.length === 1
                ? "Describe this image"
                : `Describe these ${staged?.length ?? 0} images`}
            </DialogTitle>
            <DialogDescription>
              The files are uploaded already. Give each one alt text and a category,
              then add them to the gallery.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-3">
            {(staged ?? []).map((entry, index) => (
              <li
                key={entry.image.storageId}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-border p-3"
              >
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={entry.image.url}
                    alt={entry.image.alt || `Uploaded image ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-48 flex-1 space-y-2">
                  <Input
                    autoFocus={index === 0}
                    value={entry.image.alt}
                    placeholder="Alt text — describe the photo"
                    onChange={(event) => {
                      const alt = event.target.value;
                      setStaged((current) =>
                        (current ?? []).map((s, i) =>
                          i === index ? { ...s, image: { ...s.image, alt } } : s,
                        ),
                      );
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Select
                      items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                      value={entry.category}
                      onValueChange={(value) =>
                        setStaged((current) =>
                          (current ?? []).map((s, i) =>
                            i === index ? { ...s, category: value as string } : s,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-9 flex-1">
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
                        checked={entry.tall}
                        onCheckedChange={(tall) =>
                          setStaged((current) =>
                            (current ?? []).map((s, i) =>
                              i === index ? { ...s, tall } : s,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStaged(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveStaged} disabled={saving}>
              {saving && <LoaderCircleIcon className="animate-spin" />}
              Add to gallery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------- edit dialog */}
      <EditDialog
        key={editingItem?._id ?? "none"}
        item={editingItem}
        onClose={() => setEditing(null)}
        onSave={update}
      />
    </>
  );
}

/* ------------------------------------------------------------------------- */

function EditDialog({
  item,
  onClose,
  onSave,
}: {
  item: Doc<"galleryImages"> | null;
  onClose: () => void;
  onSave: (args: {
    id: Id<"galleryImages">;
    alt: string;
    category: string;
    tall: boolean;
  }) => Promise<unknown>;
}) {
  const [alt, setAlt] = useState(item?.image.alt ?? "");
  const [category, setCategory] = useState(item?.category ?? CATEGORIES[0]);
  const [tall, setTall] = useState(item?.tall ?? false);
  const [saving, setSaving] = useState(false);

  // The dialog is remounted per image (see `key`), so this only re-syncs when the
  // row itself changes underneath — another editor saving while this one is open.
  useEffect(() => {
    if (!item) return;
    setAlt(item.image.alt);
    setCategory(item.category);
    setTall(item.tall);
  }, [item]);

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
          <DialogDescription>
            Alt text is read aloud by screen readers and indexed by search engines.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              try {
                await onSave({ id: item._id, alt: alt.trim(), category, tall });
                toast.success("Image updated.");
                onClose();
              } catch (error) {
                toast.error(cleanError(error));
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={item.image.url}
                alt={alt || "Gallery image"}
                fill
                sizes="32rem"
                className="object-cover"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-alt">Alt text</Label>
              <Input
                id="edit-alt"
                autoFocus
                value={alt}
                placeholder="Describe the photo"
                onChange={(event) => setAlt(event.target.value)}
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  value={category}
                  onValueChange={(value) => setCategory(value as string)}
                >
                  <SelectTrigger id="edit-category" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex h-10 items-center gap-2 text-sm font-semibold text-muted-foreground">
                Tall
                <Switch checked={tall} onCheckedChange={setTall} />
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
