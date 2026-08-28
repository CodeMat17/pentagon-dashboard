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
import { RecordDialog, type Field, type Values } from "@/components/dashboard/record-form";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  { name: "name", label: "Space name", kind: "text" },
  { name: "slug", label: "URL slug", kind: "slug" },
  { name: "blurb", label: "One-line blurb", kind: "text", wide: true },
  { name: "description", label: "Description", kind: "textarea", rows: 4 },
  { name: "areaSqm", label: "Area (m²)", kind: "number" },
  { name: "dimensions", label: "Dimensions", kind: "text" },
  { name: "fromRate", label: "From rate", kind: "currency" },
  { name: "order", label: "Display order", kind: "number" },
  { name: "equipment", label: "Equipment included", kind: "list" },
  { name: "image", label: "Photograph", kind: "image", wide: true },
  {
    name: "capacities",
    label: "Capacities by layout",
    kind: "objects",
    itemLabel: "Layout",
    blank: { layout: "", seats: 0 },
    fields: [
      { name: "layout", label: "Layout", kind: "text" },
      { name: "seats", label: "Seats", kind: "number" },
    ],
  },
];

type Venue = Doc<"venues">;

export default function EventSpacesPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const venues = useQuery(api.venues.list, {});
  const create = useMutation(api.venues.create);
  const update = useMutation(api.venues.update);
  const remove = useMutation(api.venues.remove);

  const [editing, setEditing] = useState<Venue | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        name: "",
        slug: "",
        blurb: "",
        description: "",
        areaSqm: 0,
        dimensions: "",
        fromRate: 0,
        order: venues?.length ?? 0,
        equipment: [],
        image: null,
        capacities: [],
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, venues?.length]);

  async function save(values: Values) {
    if (!values.image) throw new Error("An event space needs a photograph.");
    if (editing === "new") {
      await create(values as never);
      toast.success("Space created.");
    } else if (editing) {
      await update({ id: editing._id, ...(values as object) } as never);
      toast.success("Space updated.");
    }
  }

  return (
    <>
      <PageHeader
        title="Event spaces"
        description="Halls and terraces on /events, with their layouts and starting rates."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New space
            </Button>
          ) : undefined
        }
      />

      {venues === undefined ? (
        <ListSkeleton rows={3} />
      ) : venues.length === 0 ? (
        <EmptyState title="No event spaces" description="Add the conference hall first." />
      ) : (
        <RowList>
          {venues.map((venue) => (
            <RowCard key={venue._id}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={venue.image.url}
                  alt={venue.image.alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{venue.name}</h2>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {venue.blurb}
                </p>
                <p className="numeric mt-1 text-sm text-muted-foreground">
                  {venue.areaSqm} m² · {venue.dimensions} · from{" "}
                  {formatNaira(venue.fromRate)} ·{" "}
                  {venue.capacities.length
                    ? `up to ${Math.max(...venue.capacities.map((c) => c.seats))} seated`
                    : "no layouts set"}
                </p>
              </div>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${venue.name}`}
                    onClick={() => setEditing(venue)}
                  >
                    <PencilIcon />
                  </Button>
                  <DeleteButton
                    label={venue.name}
                    description="The space and its photograph are removed from Convex storage."
                    onConfirm={() => remove({ id: venue._id })}
                  />
                </div>
              )}
            </RowCard>
          ))}
        </RowList>
      )}

      <RecordDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New event space" : "Edit event space"}
        description="Shown on /events and in the quote request form."
        fields={fields}
        initial={initial}
        onSubmit={save}
        submitLabel={editing === "new" ? "Create space" : "Save changes"}
      />
    </>
  );
}
