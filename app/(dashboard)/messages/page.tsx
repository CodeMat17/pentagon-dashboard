"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery } from "convex/react";
import { MailIcon, PhoneIcon } from "lucide-react";
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
import { cleanError } from "@/components/dashboard/record-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { atLeast } from "@/lib/roles";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "new", "read", "archived"] as const;

const KIND_LABELS: Record<Doc<"messages">["kind"], string> = {
  contact: "Contact form",
  "event-quote": "Event quote",
  "table-reservation": "Table booking",
};

export default function MessagesPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.page,
    filter === "All" ? {} : { status: filter },
    { initialNumItems: 20 },
  );

  const setStatus = useMutation(api.messages.setStatus);
  const remove = useMutation(api.messages.remove);

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Everything guests send through the website — contact, event quotes and table bookings."
        action={
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "default" : "outline"}
                onClick={() => setFilter(value)}
              >
                {value === "All" ? "All" : value}
              </Button>
            ))}
          </div>
        }
      />

      {status === "LoadingFirstPage" ? (
        <ListSkeleton />
      ) : results.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description={
            filter === "new"
              ? "No unread enquiries — the inbox is clear."
              : "Messages appear here as soon as a guest submits a form."
          }
        />
      ) : (
        <>
          <RowList>
            {results.map((message) => (
              <RowCard
                key={message._id}
                className={cn(
                  "flex-col items-stretch",
                  message.status === "new" && "border-brand/50",
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{KIND_LABELS[message.kind]}</Badge>
                      {message.status === "new" && <Badge>New</Badge>}
                      {message.status === "archived" && (
                        <Badge variant="outline">Archived</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(message._creationTime)}
                      </span>
                    </div>

                    <h2 className="mt-1 font-bold">{message.subject}</h2>
                    <p className="text-sm text-muted-foreground">
                      {message.name} ·{" "}
                      <a className="hover:underline" href={`mailto:${message.email}`}>
                        <MailIcon className="mr-1 inline size-3.5" />
                        {message.email}
                      </a>
                      {message.phone && (
                        <>
                          {" · "}
                          <a className="hover:underline" href={`tel:${message.phone}`}>
                            <PhoneIcon className="mr-1 inline size-3.5" />
                            {message.phone}
                          </a>
                        </>
                      )}
                    </p>
                  </div>

                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                      {message.status !== "read" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await setStatus({ id: message._id, status: "read" });
                            } catch (error) {
                              toast.error(cleanError(error));
                            }
                          }}
                        >
                          Mark read
                        </Button>
                      )}
                      {message.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await setStatus({ id: message._id, status: "archived" });
                            } catch (error) {
                              toast.error(cleanError(error));
                            }
                          }}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        render={
                          <a
                            href={`mailto:${message.email}?subject=${encodeURIComponent(
                              `Re: ${message.subject}`,
                            )}`}
                          />
                        }
                      >
                        Reply
                      </Button>
                      <DeleteButton
                        label="this enquiry"
                        description="The message is deleted permanently. Archive it instead if you may need it later."
                        onConfirm={() => remove({ id: message._id })}
                      />
                    </div>
                  )}
                </div>

                <p className="border-t border-border pt-3 text-sm whitespace-pre-line">
                  {message.body}
                </p>

                {message.details.length > 0 && (
                  <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {message.details.map((detail) => (
                      <div key={detail.label} className="flex gap-2">
                        <dt className="font-semibold text-muted-foreground">
                          {detail.label}
                        </dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </RowCard>
            ))}
          </RowList>

          {status === "CanLoadMore" && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => loadMore(20)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
