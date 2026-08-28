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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atLeast } from "@/lib/roles";

/**
 * Two flat lists that behave identically, so they share a screen: the guest
 * services A–Z on /services and the "what's nearby" table on /location.
 */

const serviceFields: readonly Field[] = [
  { name: "name", label: "Service", kind: "text" },
  { name: "icon", label: "Icon", kind: "text", hint: "lucide name, e.g. concierge-bell." },
  { name: "availability", label: "Availability", kind: "text" },
  { name: "order", label: "Display order", kind: "number" },
  { name: "description", label: "Description", kind: "textarea", rows: 2 },
];

const attractionFields: readonly Field[] = [
  { name: "name", label: "Place", kind: "text" },
  { name: "category", label: "Category", kind: "text" },
  { name: "distanceKm", label: "Distance (km)", kind: "number", step: 0.1 },
  { name: "minutes", label: "Drive time (minutes)", kind: "number" },
  { name: "order", label: "Display order", kind: "number" },
  { name: "note", label: "Note", kind: "textarea", rows: 2 },
];

type Service = Doc<"guestServices">;
type Attraction = Doc<"attractions">;

export default function ServicesPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  return (
    <>
      <PageHeader
        title="Services & nearby"
        description="The guest-services list, and the places we tell guests about on /location."
      />

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Guest services</TabsTrigger>
          <TabsTrigger value="nearby">Nearby places</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="pt-4">
          <ServicesTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="nearby" className="pt-4">
          <NearbyTab canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function ServicesTab({ canEdit }: { canEdit: boolean }) {
  const services = useQuery(api.directory.services, {});
  const create = useMutation(api.directory.createService);
  const update = useMutation(api.directory.updateService);
  const remove = useMutation(api.directory.removeService);

  const [editing, setEditing] = useState<Service | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        name: "",
        icon: "concierge-bell",
        availability: "",
        description: "",
        order: services?.length ?? 0,
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, services?.length]);

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <PlusIcon /> New service
          </Button>
        </div>
      )}

      {services === undefined ? (
        <ListSkeleton rows={4} />
      ) : services.length === 0 ? (
        <EmptyState title="No services listed" description="Add concierge, laundry, transfers…" />
      ) : (
        <RowList>
          {services.map((service) => (
            <RowCard key={service._id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{service.name}</h3>
                  <Badge variant="outline">{service.availability}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${service.name}`}
                    onClick={() => setEditing(service)}
                  >
                    <PencilIcon />
                  </Button>
                  <DeleteButton
                    label={service.name}
                    description="It disappears from the services page immediately."
                    onConfirm={() => remove({ id: service._id })}
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
        title={editing === "new" ? "New service" : "Edit service"}
        description="Listed alphabetically on /services."
        fields={serviceFields}
        initial={initial}
        onSubmit={async (values) => {
          if (editing === "new") {
            await create(values as never);
            toast.success("Service added.");
          } else if (editing) {
            await update({ id: editing._id, ...(values as object) } as never);
            toast.success("Service updated.");
          }
        }}
      />
    </>
  );
}

function NearbyTab({ canEdit }: { canEdit: boolean }) {
  const attractions = useQuery(api.directory.attractions, {});
  const create = useMutation(api.directory.createAttraction);
  const update = useMutation(api.directory.updateAttraction);
  const remove = useMutation(api.directory.removeAttraction);

  const [editing, setEditing] = useState<Attraction | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        name: "",
        category: "",
        distanceKm: 0,
        minutes: 0,
        note: "",
        order: attractions?.length ?? 0,
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, attractions?.length]);

  return (
    <>
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <PlusIcon /> New place
          </Button>
        </div>
      )}

      {attractions === undefined ? (
        <ListSkeleton rows={4} />
      ) : attractions.length === 0 ? (
        <EmptyState
          title="Nothing nearby listed"
          description="Add the airport, the university and the market to start."
        />
      ) : (
        <RowList>
          {attractions.map((attraction) => (
            <RowCard key={attraction._id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{attraction.name}</h3>
                  <Badge variant="secondary">{attraction.category}</Badge>
                </div>
                <p className="numeric mt-1 text-sm text-muted-foreground">
                  {attraction.distanceKm} km · about {attraction.minutes} minutes
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{attraction.note}</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${attraction.name}`}
                    onClick={() => setEditing(attraction)}
                  >
                    <PencilIcon />
                  </Button>
                  <DeleteButton
                    label={attraction.name}
                    description="It disappears from the location page immediately."
                    onConfirm={() => remove({ id: attraction._id })}
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
        title={editing === "new" ? "New nearby place" : "Edit nearby place"}
        description="Shown in the distances table on /location."
        fields={attractionFields}
        initial={initial}
        onSubmit={async (values) => {
          if (editing === "new") {
            await create(values as never);
            toast.success("Place added.");
          } else if (editing) {
            await update({ id: editing._id, ...(values as object) } as never);
            toast.success("Place updated.");
          }
        }}
      />
    </>
  );
}
