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
import { formatDate, todayISO } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  { name: "title", label: "Title", kind: "text" },
  { name: "slug", label: "URL slug", kind: "slug" },
  { name: "tag", label: "Tag", kind: "text", hint: "e.g. City guide." },
  { name: "date", label: "Publish date", kind: "text", hint: "yyyy-mm-dd." },
  { name: "readMinutes", label: "Read time (minutes)", kind: "number" },
  { name: "excerpt", label: "Excerpt", kind: "textarea", rows: 2 },
  { name: "image", label: "Header image", kind: "image", wide: true },
  { name: "body", label: "Article", kind: "paragraphs", rows: 14 },
  { name: "published", label: "Published", kind: "switch" },
];

type Post = Doc<"posts">;

export default function JournalPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const posts = useQuery(api.posts.all, {});
  const create = useMutation(api.posts.create);
  const update = useMutation(api.posts.update);
  const remove = useMutation(api.posts.remove);
  const setPublished = useMutation(api.posts.setPublished);

  const [editing, setEditing] = useState<Post | "new" | null>(null);

  const initial = useMemo<Values>(() => {
    if (editing === "new" || editing === null) {
      return {
        title: "",
        slug: "",
        tag: "",
        date: todayISO(),
        readMinutes: 4,
        excerpt: "",
        image: null,
        body: [],
        published: false,
      };
    }
    const { _id, _creationTime, ...rest } = editing;
    void _id;
    void _creationTime;
    return rest;
  }, [editing]);

  const sorted = useMemo(
    () => [...(posts ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [posts],
  );

  async function save(values: Values) {
    if (!values.image) throw new Error("A post needs a header image.");
    if (editing === "new") {
      await create(values as never);
      toast.success("Post created.");
    } else if (editing) {
      await update({ id: editing._id, ...(values as object) } as never);
      toast.success("Post updated.");
    }
  }

  return (
    <>
      <PageHeader
        title="Journal"
        description="Articles on /blog — city guides, hotel news and anything worth writing down."
        action={
          canEdit ? (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> New post
            </Button>
          ) : undefined
        }
      />

      {posts === undefined ? (
        <ListSkeleton />
      ) : sorted.length === 0 ? (
        <EmptyState title="Nothing published yet" description="Write the first post." />
      ) : (
        <RowList>
          {sorted.map((post) => (
            <RowCard key={post._id}>
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={post.image.url}
                  alt={post.image.alt}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{post.title}</h2>
                  <Badge variant="secondary">{post.tag}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(post.date)} · {post.readMinutes} min read ·{" "}
                  {post.body.length} paragraphs
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  Live
                  <Switch
                    checked={post.published}
                    disabled={!canEdit}
                    onCheckedChange={async (published) => {
                      try {
                        await setPublished({ id: post._id, published });
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
                      aria-label={`Edit ${post.title}`}
                      onClick={() => setEditing(post)}
                    >
                      <PencilIcon />
                    </Button>
                    <DeleteButton
                      label={post.title}
                      description="The post and its header image are removed from Convex storage."
                      onConfirm={() => remove({ id: post._id })}
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
        title={editing === "new" ? "New post" : "Edit post"}
        description="Paragraphs are separated by a blank line — no markdown needed."
        fields={fields}
        initial={initial}
        onSubmit={save}
        submitLabel={editing === "new" ? "Create post" : "Save changes"}
      />
    </>
  );
}
