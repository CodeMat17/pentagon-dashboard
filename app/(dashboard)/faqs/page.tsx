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
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  {
    name: "category",
    label: "Category",
    kind: "text",
    hint: "Questions are grouped by this on /faq — reuse the exact spelling.",
  },
  { name: "order", label: "Display order", kind: "number" },
  { name: "question", label: "Question", kind: "text", wide: true },
  { name: "answer", label: "Answer", kind: "textarea", rows: 5 },
  { name: "published", label: "Published", kind: "switch" },
];

type Faq = Doc<"faqs">;

export default function FaqsPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const faqs = useQuery(api.faqs.all, {});
  const create = useMutation(api.faqs.create);
  const update = useMutation(api.faqs.update);
  const remove = useMutation(api.faqs.remove);

  const [editing, setEditing] = useState<Faq | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        category: "",
        question: "",
        answer: "",
        order: faqs?.length ?? 0,
        published: true,
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing, faqs?.length]);

  // Grouped for display exactly as the website groups them.
  const grouped = useMemo(() => {
    const map = new Map<string, Faq[]>();
    for (const faq of [...(faqs ?? [])].sort((a, b) => a.order - b.order)) {
      const list = map.get(faq.category) ?? [];
      list.push(faq);
      map.set(faq.category, list);
    }
    return [...map.entries()];
  }, [faqs]);

  return (
    <>
      <PageHeader
        title="FAQs"
        description="The questions on /faq. They also feed the FAQPage structured data Google reads."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New question
            </Button>
          ) : undefined
        }
      />

      {faqs === undefined ? (
        <ListSkeleton rows={5} />
      ) : grouped.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Start with the ones reception answers most often."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="eyebrow mb-3">{category}</h2>
              <RowList>
                {items.map((faq) => (
                  <RowCard key={faq._id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{faq.question}</h3>
                        {!faq.published && <Badge variant="outline">Hidden</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={faq.published}
                        disabled={!canEdit}
                        aria-label={`Publish ${faq.question}`}
                        onCheckedChange={async (published) => {
                          try {
                            await update({
                              id: faq._id,
                              category: faq.category,
                              question: faq.question,
                              answer: faq.answer,
                              order: faq.order,
                              published,
                            });
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
                            aria-label={`Edit ${faq.question}`}
                            onClick={() => setEditing(faq)}
                          >
                            <PencilIcon />
                          </Button>
                          <DeleteButton
                            label="this question"
                            description="It is removed from the FAQ page and its structured data."
                            onConfirm={() => remove({ id: faq._id })}
                          />
                        </>
                      )}
                    </div>
                  </RowCard>
                ))}
              </RowList>
            </section>
          ))}
        </div>
      )}

      <RecordDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "New question" : "Edit question"}
        description="Answer in full sentences — this text is what Google may quote."
        fields={fields}
        initial={initial}
        onSubmit={async (values) => {
          if (editing === "new") {
            await create(values as never);
            toast.success("Question added.");
          } else if (editing) {
            await update({ id: editing._id, ...(values as object) } as never);
            toast.success("Question updated.");
          }
        }}
      />
    </>
  );
}
