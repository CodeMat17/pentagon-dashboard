"use client";

import { useMemo, useState } from "react";
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
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  { name: "category", label: "Category", kind: "text", hint: "e.g. Recreation." },
  { name: "order", label: "Display order", kind: "number" },
  { name: "blurb", label: "Category blurb", kind: "text", wide: true },
  {
    name: "items",
    label: "Facilities in this category",
    kind: "objects",
    itemLabel: "Facility",
    blank: { name: "", description: "", icon: "sparkles", hours: "" },
    fields: [
      { name: "name", label: "Name", kind: "text" },
      {
        name: "icon",
        label: "Icon",
        kind: "text",
        hint: "A lucide icon name in kebab-case, e.g. waves, dumbbell, wifi.",
      },
      { name: "description", label: "Description", kind: "textarea", rows: 2 },
      { name: "hours", label: "Hours (optional)", kind: "text" },
    ],
  },
];

type Group = Doc<"facilityGroups">;

export default function FacilitiesPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const groups = useQuery(api.facilities.list, {});
  const create = useMutation(api.facilities.create);
  const update = useMutation(api.facilities.update);
  const remove = useMutation(api.facilities.remove);

  const [editing, setEditing] = useState<Group | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return { category: "", blurb: "", items: [], order: groups?.length ?? 0 };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    // Blank `hours` reaches Convex as undefined — the field is optional there.
    return {
      ...rest,
      items: rest.items.map((item) => ({ ...item, hours: item.hours ?? "" })),
    };
  }, [editing, groups?.length]);

  async function save(values: Values) {
    const items = (values.items as Values[]).map((item) => ({
      ...item,
      hours: item.hours ? item.hours : undefined,
    }));
    const payload = { ...values, items };

    if (editing === "new") {
      await create(payload as never);
      toast.success("Category created.");
    } else if (editing) {
      await update({ id: editing._id, ...(payload as object) } as never);
      toast.success("Category updated.");
    }
  }

  return (
    <>
      <PageHeader
        title="Facilities"
        description="What the hotel offers, grouped by category exactly as /facilities renders it."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New category
            </Button>
          ) : undefined
        }
      />

      {groups === undefined ? (
        <ListSkeleton rows={3} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No facilities yet"
          description="Group them the way guests think about them: recreation, business, dining."
        />
      ) : (
        <RowList>
          {groups.map((group) => (
            <RowCard key={group._id} className="flex-col items-stretch">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">{group.category}</h2>
                  <p className="text-sm text-muted-foreground">{group.blurb}</p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit ${group.category}`}
                      onClick={() => setEditing(group)}
                    >
                      <PencilIcon />
                    </Button>
                    <DeleteButton
                      label={group.category}
                      description="The whole category and every facility inside it is removed."
                      onConfirm={() => remove({ id: group._id })}
                    />
                  </div>
                )}
              </div>

              <ul className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={item.name}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-semibold"
                  >
                    {item.name}
                    {item.hours ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {item.hours}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </RowCard>
          ))}
        </RowList>
      )}

      <RecordDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New facility category" : "Edit facility category"}
        description="Each category becomes one block on the facilities page."
        fields={fields}
        initial={initial}
        onSubmit={save}
        submitLabel={editing === "new" ? "Create category" : "Save changes"}
      />
    </>
  );
}
