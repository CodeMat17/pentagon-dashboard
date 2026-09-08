"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/dashboard/page-header";
import { useViewer } from "@/components/dashboard/shell";
import {
  DeleteButton,
  EmptyState,
  ListSkeleton,
  RowCard,
  RowList,
} from "@/components/dashboard/list";
import { RecordDialog, cleanError, type Field, type Values } from "@/components/dashboard/record-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatNaira } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const CATEGORIES = [
  "Standard",
  "Deluxe",
  "Premium Deluxe",
  "Executive",
  "Suite",
  "Suite Parlour",
] as const;
const BEDS = ["King", "Queen", "Twin", "Double"] as const;

const fields: readonly Field[] = [
  { name: "name", label: "Room name", kind: "text" },
  {
    name: "slug",
    label: "URL slug",
    kind: "slug",
    from: "name",
    hint: "Generated from the room name. Appears as /rooms/<slug>.",
  },
  { name: "category", label: "Category", kind: "select", options: CATEGORIES },
  { name: "bed", label: "Bed", kind: "select", options: BEDS },
  { name: "tagline", label: "Tagline", kind: "text", wide: true },
  { name: "description", label: "Short description", kind: "textarea", rows: 3 },
  {
    name: "longDescription",
    label: "Detail page copy",
    kind: "paragraphs",
    hint: "One paragraph per block, separated by a blank line.",
  },
  { name: "rate", label: "Nightly rate", kind: "currency" },
  {
    name: "rackRate",
    label: "Rack rate",
    kind: "currency",
    hint: "The struck-through comparison price. Set 0 to hide it.",
  },
  { name: "sizeSqm", label: "Size (m²)", kind: "number" },
  { name: "inventory", label: "Rooms of this type", kind: "number" },
  { name: "maxAdults", label: "Max adults", kind: "number" },
  { name: "maxChildren", label: "Max children", kind: "number" },
  { name: "view", label: "View", kind: "text" },
  { name: "bathroom", label: "Bathroom", kind: "text" },
  { name: "amenities", label: "Amenities", kind: "list", placeholder: "e.g. Free Wi-Fi" },
  { name: "cancellation", label: "Cancellation policy", kind: "textarea", rows: 2 },
  { name: "images", label: "Photographs", kind: "images" },
  { name: "accessible", label: "Step-free / accessible", kind: "switch" },
  { name: "featured", label: "Feature on the homepage", kind: "switch" },
  { name: "published", label: "Published", kind: "switch" },
];

const blank: Values = {
  name: "",
  slug: "",
  category: "Standard",
  bed: "Queen",
  tagline: "",
  description: "",
  longDescription: [],
  rate: 0,
  rackRate: 0,
  sizeSqm: 0,
  inventory: 1,
  maxAdults: 2,
  maxChildren: 0,
  view: "",
  bathroom: "",
  amenities: [],
  cancellation: "",
  images: [],
  accessible: false,
  featured: false,
  published: false,
  order: 0,
};

type Room = Doc<"rooms">;

export default function RoomsPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const rooms = useQuery(api.rooms.all, {});
  const create = useMutation(api.rooms.create);
  const update = useMutation(api.rooms.update);
  const remove = useMutation(api.rooms.remove);
  const setPublished = useMutation(api.rooms.setPublished);

  const [editing, setEditing] = useState<Room | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return { ...blank, order: rooms?.length ?? 0 };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return { ...rest, rackRate: rest.rackRate ?? 0 };
  }, [editing, rooms?.length]);

  const sorted = useMemo(
    () => [...(rooms ?? [])].sort((a, b) => a.order - b.order),
    [rooms],
  );

  async function save(values: Values) {
    // The public site indexes `images[0]` for the room card, the booking flow
    // and the OpenGraph tag. Convex enforces this too — this is just the
    // friendlier message, raised before the round trip.
    if (values.published && (values.images as unknown[]).length === 0) {
      throw new Error(
        "A published room needs at least one photograph. Add one, or turn Published off.",
      );
    }

    // `rackRate` is optional in the schema; 0 in the form means "no rack rate".
    const rackRate = Number(values.rackRate) || undefined;
    const payload = { ...values, rackRate } as never;

    if (editing === "new") {
      await create(payload);
      toast.success("Room created.");
    } else if (editing) {
      await update({ id: editing._id, ...(payload as object) } as never);
      toast.success("Room updated.");
    }
  }

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Every room type the website sells, with its rates, capacity and photography."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New room
            </Button>
          ) : undefined
        }
      />

      {rooms === undefined ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          description="Add your first room type, or import the original website content from Settings."
          action={
            canEdit ? (
              <Button onClick={() => setEditing("new")}>
                <PlusIcon /> New room
              </Button>
            ) : undefined
          }
        />
      ) : (
        <RowList>
          {sorted.map((room) => (
            <RowCard key={room._id}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {room.images[0] && (
                  <Image
                    src={room.images[0].url}
                    alt={room.images[0].alt}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{room.name}</h2>
                  <Badge variant="secondary">{room.category}</Badge>
                  {room.featured && <Badge>Featured</Badge>}
                  {room.accessible && <Badge variant="outline">Accessible</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {room.tagline}
                </p>
                <p className="numeric mt-1 text-sm">
                  <span className="font-bold">{formatNaira(room.rate)}</span> / night ·{" "}
                  {room.bed} bed · sleeps {room.maxAdults + room.maxChildren} ·{" "}
                  {room.inventory} in inventory · {room.images.length} photo
                  {room.images.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  Live
                  <Switch
                    checked={room.published}
                    disabled={!canEdit}
                    onCheckedChange={async (published) => {
                      try {
                        await setPublished({ id: room._id, published });
                      } catch (error) {
                        toast.error(cleanError(error));
                      }
                    }}
                  />
                </label>
                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${room.name}`}
                      onClick={() => setEditing(room)}
                    >
                      <PencilIcon />
                    </Button>
                    <DeleteButton
                      label={room.name}
                      description="The room and all of its photographs are removed from Convex storage. Existing reservations keep the room name they were booked under."
                      onConfirm={() => remove({ id: room._id })}
                    />
                  </>
                )}
              </div>
            </RowCard>
          ))}
        </RowList>
      )}

      <RecordDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New room" : "Edit room"}
        description="Everything here appears on /rooms and in the booking flow."
        fields={fields}
        initial={initial}
        onSubmit={save}
        submitLabel={editing === "new" ? "Create room" : "Save changes"}
        footnote="Unpublished rooms stay hidden from the website and cannot be booked."
      />
    </>
  );
}
