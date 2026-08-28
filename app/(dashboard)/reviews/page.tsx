"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { PencilIcon, PlusIcon, StarIcon } from "lucide-react";
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
import { formatDate, todayISO } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  { name: "author", label: "Guest name", kind: "text" },
  { name: "rating", label: "Rating (1–5)", kind: "number" },
  { name: "source", label: "Source", kind: "text", hint: "e.g. Google, Booking.com." },
  { name: "date", label: "Date", kind: "text", hint: "yyyy-mm-dd." },
  { name: "title", label: "Headline", kind: "text", wide: true },
  { name: "stayType", label: "Stay type", kind: "text", wide: true },
  { name: "body", label: "Review", kind: "textarea", rows: 5 },
  { name: "order", label: "Display order", kind: "number" },
  { name: "published", label: "Published", kind: "switch" },
];

type Review = Doc<"reviews">;

export default function ReviewsPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const reviews = useQuery(api.reviews.all, {});
  const create = useMutation(api.reviews.create);
  const update = useMutation(api.reviews.update);
  const remove = useMutation(api.reviews.remove);
  const setPublished = useMutation(api.reviews.setPublished);

  const [editing, setEditing] = useState<Review | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        author: "",
        rating: 5,
        source: "Google",
        date: todayISO(),
        title: "",
        stayType: "",
        body: "",
        order: reviews?.length ?? 0,
        published: true,
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, reviews?.length]);

  const sorted = useMemo(
    () => [...(reviews ?? [])].sort((a, b) => a.order - b.order),
    [reviews],
  );

  const published = sorted.filter((review) => review.published);
  const average = published.length
    ? Math.round(
        (published.reduce((sum, review) => sum + review.rating, 0) / published.length) * 10,
      ) / 10
    : 0;

  return (
    <>
      <PageHeader
        title="Reviews"
        description={
          published.length
            ? `${average} out of 5 across ${published.length} published reviews — the figure the site puts in its structured data.`
            : "Guest reviews shown on the homepage carousel and in structured data."
        }
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New review
            </Button>
          ) : undefined
        }
      />

      {reviews === undefined ? (
        <ListSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Add the ones guests have already left elsewhere, with their source credited."
        />
      ) : (
        <RowList>
          {sorted.map((review) => (
            <RowCard key={review._id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="flex items-center gap-0.5 text-brand"
                    aria-label={`${review.rating} out of 5`}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <StarIcon
                        key={index}
                        className={index < review.rating ? "size-3.5 fill-current" : "size-3.5 opacity-30"}
                        aria-hidden
                      />
                    ))}
                  </span>
                  <h3 className="font-bold">{review.title}</h3>
                  <Badge variant="secondary">{review.source}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {review.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {review.author} · {formatDate(review.date)} · {review.stayType}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={review.published}
                  disabled={!canEdit}
                  aria-label={`Publish review by ${review.author}`}
                  onCheckedChange={async (next) => {
                    try {
                      await setPublished({ id: review._id, published: next });
                    } catch (error) {
                      toast.error(cleanError(error));
                    }
                  }}
                />
                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Edit review by ${review.author}`}
                      onClick={() => setEditing(review)}
                    >
                      <PencilIcon />
                    </Button>
                    <DeleteButton
                      label={`the review by ${review.author}`}
                      description="It is removed from the site and from the rating average."
                      onConfirm={() => remove({ id: review._id })}
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
        title={editing === "new" ? "New review" : "Edit review"}
        description="Only publish reviews a guest actually left — this feeds structured data Google trusts."
        fields={fields}
        initial={initial}
        onSubmit={async (values) => {
          if (editing === "new") {
            await create(values as never);
            toast.success("Review added.");
          } else if (editing) {
            await update({ id: editing._id, ...(values as object) } as never);
            toast.success("Review updated.");
          }
        }}
      />
    </>
  );
}
