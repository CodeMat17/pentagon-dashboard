"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { useViewer } from "@/components/dashboard/shell";
import {
  DeleteButton,
  EmptyState,
  ListSkeleton,
  RowCard,
  RowList,
} from "@/components/dashboard/list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { atLeast } from "@/lib/roles";

export default function SubscribersPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const { results, status, loadMore } = usePaginatedQuery(
    api.subscribers.page,
    {},
    { initialNumItems: 50 },
  );
  const remove = useMutation(api.subscribers.remove);

  /** Exports what is currently loaded — enough for a mailing tool import. */
  function exportCsv() {
    const rows = [
      "email,status,source,subscribed_at",
      ...results.map((row) =>
        [
          row.email,
          row.status,
          row.source,
          new Date(row._creationTime).toISOString(),
        ].join(","),
      ),
    ].join("\n");

    const url = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pentagon-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${results.length} subscribers exported.`);
  }

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Everyone who signed up through the website footer."
        action={
          results.length > 0 ? (
            <Button variant="outline" onClick={exportCsv}>
              <DownloadIcon /> Export CSV
            </Button>
          ) : undefined
        }
      />

      {status === "LoadingFirstPage" ? (
        <ListSkeleton rows={5} />
      ) : results.length === 0 ? (
        <EmptyState
          title="No subscribers yet"
          description="Sign-ups from the website footer land here immediately."
        />
      ) : (
        <>
          <RowList>
            {results.map((subscriber) => (
              <RowCard key={subscriber._id} className="items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{subscriber.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(subscriber._creationTime)} · via {subscriber.source}
                  </p>
                </div>
                {subscriber.status === "unsubscribed" && (
                  <Badge variant="outline">Unsubscribed</Badge>
                )}
                {canEdit && (
                  <DeleteButton
                    label={subscriber.email}
                    description="The address is removed from the list entirely."
                    onConfirm={() => remove({ id: subscriber._id })}
                  />
                )}
              </RowCard>
            ))}
          </RowList>

          {status === "CanLoadMore" && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => loadMore(50)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
