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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  { name: "name", label: "Venue name", kind: "text" },
  { name: "slug", label: "URL slug", kind: "slug" },
  { name: "cuisine", label: "Cuisine", kind: "text" },
  { name: "dressCode", label: "Dress code", kind: "text" },
  { name: "blurb", label: "One-line blurb", kind: "text", wide: true },
  { name: "description", label: "Description", kind: "textarea", rows: 4 },
  { name: "hours", label: "Opening hours", kind: "text", wide: true },
  { name: "capacity", label: "Covers", kind: "number" },
  { name: "order", label: "Display order", kind: "number" },
  { name: "image", label: "Photograph", kind: "image", wide: true },
  {
    name: "highlights",
    label: "Menu highlights",
    kind: "objects",
    itemLabel: "Dish",
    blank: { name: "", description: "", price: 0 },
    fields: [
      { name: "name", label: "Dish", kind: "text" },
      { name: "price", label: "Price", kind: "currency" },
      { name: "description", label: "Description", kind: "textarea", rows: 2 },
    ],
  },
];

type Venue = Doc<"diningVenues">;

export default function DiningPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const venues = useQuery(api.dining.list, {});
  const create = useMutation(api.dining.create);
  const update = useMutation(api.dining.update);
  const remove = useMutation(api.dining.remove);

  const [editing, setEditing] = useState<Venue | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        name: "",
        slug: "",
        cuisine: "",
        dressCode: "",
        blurb: "",
        description: "",
        hours: "",
        capacity: 0,
        order: venues?.length ?? 0,
        image: null,
        highlights: [],
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, venues?.length]);

  async function save(values: Values) {
    if (!values.image) throw new Error("A dining venue needs a photograph.");
    if (editing === "new") {
      await create(values as never);
      toast.success("Venue created.");
    } else if (editing) {
      await update({ id: editing._id, ...(values as object) } as never);
      toast.success("Venue updated.");
    }
  }

  return (
    <>
      <PageHeader
        title="Dining"
        description="Restaurants and bars on /dining, with the menu highlights each one shows."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New venue
            </Button>
          ) : undefined
        }
      />

      {venues === undefined ? (
        <ListSkeleton rows={3} />
      ) : venues.length === 0 ? (
        <EmptyState title="No dining venues" description="Add the restaurant, bar or café." />
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{venue.name}</h2>
                  <Badge variant="secondary">{venue.cuisine}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{venue.hours}</p>
                <p className="numeric mt-1 text-sm text-muted-foreground">
                  {venue.capacity} covers · {venue.highlights.length} dishes ·{" "}
                  {venue.highlights.length > 0 &&
                    `from ${formatNaira(
                      Math.min(...venue.highlights.map((dish) => dish.price)),
                    )}`}
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
                    description="The venue and its photograph are removed from Convex storage."
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
        title={editing === "new" ? "New dining venue" : "Edit dining venue"}
        description="Shown on /dining and in the restaurant JSON-LD."
        fields={fields}
        initial={initial}
        onSubmit={save}
        submitLabel={editing === "new" ? "Create venue" : "Save changes"}
      />
    </>
  );
}
