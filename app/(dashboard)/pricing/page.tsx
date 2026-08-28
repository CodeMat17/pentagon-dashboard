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
import { RecordDialog, cleanError, type Field, type Values } from "@/components/dashboard/record-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNaira } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const extraFields: readonly Field[] = [
  { name: "name", label: "Extra", kind: "text" },
  {
    name: "key",
    label: "Key",
    kind: "slug",
    hint: "Stored against each reservation — changing it orphans past bookings.",
  },
  { name: "price", label: "Price", kind: "currency" },
  { name: "unit", label: "Charged", kind: "select", options: ["stay", "night"] },
  { name: "icon", label: "Icon", kind: "text", hint: "lucide name, e.g. plane." },
  { name: "order", label: "Display order", kind: "number" },
  { name: "description", label: "Description", kind: "textarea", rows: 2 },
  { name: "active", label: "Offered at checkout", kind: "switch" },
];

const promoFields: readonly Field[] = [
  { name: "code", label: "Code", kind: "text", hint: "Upper-cased automatically." },
  {
    name: "discount",
    label: "Discount",
    kind: "percent",
    hint: "A fraction: 0.15 means 15% off the room subtotal.",
  },
  { name: "label", label: "Label shown to the guest", kind: "text", wide: true },
  { name: "active", label: "Accepted at checkout", kind: "switch" },
];

export default function PricingPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  return (
    <>
      <PageHeader
        title="Extras & promos"
        description="The two levers that change what a guest pays: bookable add-ons, and discount codes."
      />

      <Tabs defaultValue="extras">
        <TabsList>
          <TabsTrigger value="extras">Extras</TabsTrigger>
          <TabsTrigger value="promos">Promo codes</TabsTrigger>
        </TabsList>

        <TabsContent value="extras" className="pt-4">
          <ExtrasTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="promos" className="pt-4">
          <PromosTab canEdit={canEdit} isAdmin={atLeast(viewer.role, "admin")} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ExtrasTab({ canEdit }: { canEdit: boolean }) {
  const extras = useQuery(api.pricing.allExtras, {});
  const create = useMutation(api.pricing.createExtra);
  const update = useMutation(api.pricing.updateExtra);
  const remove = useMutation(api.pricing.removeExtra);

  const [editing, setEditing] = useState<Doc<"extraServices"> | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        name: "",
        key: "",
        price: 0,
        unit: "stay",
        icon: "sparkles",
        order: extras?.length ?? 0,
        description: "",
        active: true,
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, extras?.length]);

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <PlusIcon /> New extra
          </Button>
        </div>
      )}

      {extras === undefined ? (
        <ListSkeleton rows={4} />
      ) : extras.length === 0 ? (
        <EmptyState
          title="No extras"
          description="Airport pickup, breakfast, late checkout — anything a guest can add at checkout."
        />
      ) : (
        <RowList>
          {[...extras]
            .sort((a, b) => a.order - b.order)
            .map((extra) => (
              <RowCard key={extra._id}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{extra.name}</h3>
                    <Badge variant="secondary" className="numeric">
                      {formatNaira(extra.price)} per {extra.unit}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{extra.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    Offered
                    <Switch
                      checked={extra.active}
                      disabled={!canEdit}
                      onCheckedChange={async (active) => {
                        try {
                          const { _id, _creationTime, ...rest } = extra;
                          void _creationTime;
                          await update({ id: _id, ...rest, active });
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
                        aria-label={`Edit ${extra.name}`}
                        onClick={() => setEditing(extra)}
                      >
                        <PencilIcon />
                      </Button>
                      <DeleteButton
                        label={extra.name}
                        description="Past reservations keep the extra's key but will no longer show its name or price."
                        onConfirm={() => remove({ id: extra._id })}
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
        title={editing === "new" ? "New extra" : "Edit extra"}
        description="Shown in step three of the booking flow."
        fields={extraFields}
        initial={initial}
        onSubmit={async (values) => {
          if (editing === "new") {
            await create(values as never);
            toast.success("Extra created.");
          } else if (editing) {
            await update({ id: editing._id, ...(values as object) } as never);
            toast.success("Extra updated.");
          }
        }}
      />
    </>
  );
}

function PromosTab({ canEdit, isAdmin }: { canEdit: boolean; isAdmin: boolean }) {
  const promos = useQuery(api.pricing.allPromos, {});
  const create = useMutation(api.pricing.createPromo);
  const update = useMutation(api.pricing.updatePromo);
  const remove = useMutation(api.pricing.removePromo);

  const [editing, setEditing] = useState<Doc<"promoCodes"> | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return { code: "", discount: 0.1, label: "", active: true };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing]);

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <PlusIcon /> New code
          </Button>
        </div>
      )}

      {promos === undefined ? (
        <ListSkeleton rows={3} />
      ) : promos.length === 0 ? (
        <EmptyState
          title="No promo codes"
          description="Codes are validated server-side, so they are never exposed in the website bundle."
        />
      ) : (
        <RowList>
          {promos.map((promo) => (
            <RowCard key={promo._id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="numeric font-bold">{promo.code}</h3>
                  <Badge variant="secondary">
                    {Math.round(promo.discount * 100)}% off rooms
                  </Badge>
                  {!promo.active && <Badge variant="outline">Paused</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{promo.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={promo.active}
                  disabled={!canEdit}
                  aria-label={`Activate ${promo.code}`}
                  onCheckedChange={async (active) => {
                    try {
                      await update({
                        id: promo._id,
                        code: promo.code,
                        discount: promo.discount,
                        label: promo.label,
                        active,
                      });
                    } catch (error) {
                      toast.error(cleanError(error));
                    }
                  }}
                />
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${promo.code}`}
                    onClick={() => setEditing(promo)}
                  >
                    <PencilIcon />
                  </Button>
                )}
                {isAdmin && (
                  <DeleteButton
                    label={promo.code}
                    description="Guests who already booked with it keep their discount; new attempts will fail."
                    onConfirm={() => remove({ id: promo._id })}
                  />
                )}
              </div>
            </RowCard>
          ))}
        </RowList>
      )}

      <RecordDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New promo code" : "Edit promo code"}
        description="Discounts apply to the room subtotal only — never to extras or tax."
        fields={promoFields}
        initial={initial}
        onSubmit={async (values) => {
          if (editing === "new") {
            await create(values as never);
            toast.success("Code created.");
          } else if (editing) {
            await update({ id: editing._id, ...(values as object) } as never);
            toast.success("Code updated.");
          }
        }}
      />
    </>
  );
}
