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

const fields: readonly Field[] = [
  { name: "title", label: "Offer title", kind: "text" },
  { name: "slug", label: "URL slug", kind: "slug" },
  { name: "blurb", label: "Card blurb", kind: "text", wide: true },
  { name: "description", label: "Description", kind: "textarea", rows: 4 },
  { name: "validity", label: "Validity", kind: "text", hint: "e.g. Friday–Sunday, all year." },
  { name: "discountLabel", label: "Discount label", kind: "text", hint: "e.g. Save 15%." },
  { name: "fromRate", label: "From rate", kind: "currency" },
  {
    name: "code",
    label: "Promo code",
    kind: "text",
    hint: "Must match a code under Extras & promos for the discount to apply.",
  },
  { name: "inclusions", label: "What's included", kind: "list" },
  { name: "terms", label: "Terms", kind: "textarea", rows: 3 },
  { name: "image", label: "Photograph", kind: "image", wide: true },
  { name: "published", label: "Published", kind: "switch" },
];

const blank: Values = {
  title: "",
  slug: "",
  blurb: "",
  description: "",
  validity: "",
  discountLabel: "",
  fromRate: 0,
  code: "",
  inclusions: [],
  terms: "",
  image: null,
  published: false,
  order: 0,
};

type Offer = Doc<"offers">;

export default function OffersPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const offers = useQuery(api.offers.all, {});
  const create = useMutation(api.offers.create);
  const update = useMutation(api.offers.update);
  const remove = useMutation(api.offers.remove);
  const setPublished = useMutation(api.offers.setPublished);

  const [editing, setEditing] = useState<Offer | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) return { ...blank, order: offers?.length ?? 0 };
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, offers?.length]);

  const sorted = useMemo(
    () => [...(offers ?? [])].sort((a, b) => a.order - b.order),
    [offers],
  );

  async function save(values: Values) {
    if (!values.image) throw new Error("An offer needs a photograph.");
    if (editing === "new") {
      await create(values as never);
      toast.success("Offer created.");
    } else if (editing) {
      await update({ id: editing._id, ...(values as object) } as never);
      toast.success("Offer updated.");
    }
  }

  return (
    <>
      <PageHeader
        title="Offers"
        description="Packages and promotions shown on /offers, each tied to a promo code."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New offer
            </Button>
          ) : undefined
        }
      />

      {offers === undefined ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No offers yet"
          description="Create a package, or import the original content from Settings."
        />
      ) : (
        <RowList>
          {sorted.map((offer) => (
            <RowCard key={offer._id}>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={offer.image.url}
                  alt={offer.image.alt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{offer.title}</h2>
                  <Badge variant="secondary">{offer.discountLabel}</Badge>
                  <Badge variant="outline" className="numeric">
                    {offer.code}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {offer.blurb}
                </p>
                <p className="numeric mt-1 text-sm">
                  From <span className="font-bold">{formatNaira(offer.fromRate)}</span> ·{" "}
                  {offer.validity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  Live
                  <Switch
                    checked={offer.published}
                    disabled={!canEdit}
                    onCheckedChange={async (published) => {
                      try {
                        await setPublished({ id: offer._id, published });
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
                      aria-label={`Edit ${offer.title}`}
                      onClick={() => setEditing(offer)}
                    >
                      <PencilIcon />
                    </Button>
                    <DeleteButton
                      label={offer.title}
                      description="The offer and its photograph are removed from Convex storage."
                      onConfirm={() => remove({ id: offer._id })}
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
        title={editing === "new" ? "New offer" : "Edit offer"}
        description="Shown on /offers and linked from the booking flow."
        fields={fields}
        initial={initial}
        onSubmit={save}
        submitLabel={editing === "new" ? "Create offer" : "Save changes"}
      />
    </>
  );
}
