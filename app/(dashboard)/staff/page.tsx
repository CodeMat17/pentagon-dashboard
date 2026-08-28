"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { PlusIcon } from "lucide-react";
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
import { RecordDialog, cleanError, type Field, type Values } from "@/components/dashboard/record-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/roles";

const ASSIGNABLE: Role[] = ["viewer", "editor", "admin"];

const inviteFields: readonly Field[] = [
  { name: "name", label: "Name", kind: "text" },
  { name: "email", label: "Work email", kind: "text" },
  {
    name: "role",
    label: "Role",
    kind: "select",
    options: ASSIGNABLE,
    wide: true,
    hint: "They claim this the first time they sign in with that email address.",
  },
];

export default function StaffPage() {
  const viewer = useViewer();
  const users = useQuery(api.users.list, {});
  const invite = useMutation(api.users.invite);
  const setRole = useMutation(api.users.setRole);
  const setActive = useMutation(api.users.setActive);
  const remove = useMutation(api.users.remove);

  const [inviting, setInviting] = useState(false);

  return (
    <>
      <PageHeader
        title="Staff"
        description="Who can open this dashboard, and what each of them may change. Clerk proves identity; these roles decide the rest."
        action={
          <Button onClick={() => setInviting(true)}>
            <PlusIcon /> Give someone access
          </Button>
        }
      />

      <dl className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["viewer", "editor", "admin", "owner"] as Role[]).map((role) => (
          <div key={role} className="rounded-xl border border-border bg-card p-3">
            <dt className="text-sm font-bold">{ROLE_LABELS[role]}</dt>
            <dd className="mt-1 text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </dd>
          </div>
        ))}
      </dl>

      {users === undefined ? (
        <ListSkeleton rows={3} />
      ) : users.length === 0 ? (
        <EmptyState title="No staff yet" description="Invite someone to get started." />
      ) : (
        <RowList>
          {users.map((user) => {
            const isSelf = user._id === viewer.id;
            const locked = user.role === "owner";

            return (
              <RowCard key={user._id} className="items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{user.name}</p>
                    {locked && <Badge>Owner</Badge>}
                    {!user.subject && <Badge variant="outline">Invited</Badge>}
                    {!user.active && <Badge variant="outline">Deactivated</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.lastSeenAt
                      ? `Last seen ${formatDateTime(user.lastSeenAt)}`
                      : "Has not signed in yet"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-40">
                    <Select
                      items={ASSIGNABLE.map((role) => ({
                        value: role,
                        label: ROLE_LABELS[role],
                      }))}
                      value={locked ? "admin" : user.role}
                      onValueChange={async (value) => {
                        try {
                          await setRole({ id: user._id, role: value as Role });
                          toast.success(`${user.name} is now ${ROLE_LABELS[value as Role]}.`);
                        } catch (error) {
                          toast.error(cleanError(error));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full" disabled={locked}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    Active
                    <Switch
                      checked={user.active}
                      disabled={locked}
                      onCheckedChange={async (active) => {
                        try {
                          await setActive({ id: user._id, active });
                        } catch (error) {
                          toast.error(cleanError(error));
                        }
                      }}
                    />
                  </label>

                  {!locked && !isSelf && (
                    <DeleteButton
                      label={user.name}
                      description="They lose access immediately. Their Clerk account is untouched — this only removes the dashboard role."
                      onConfirm={() => remove({ id: user._id })}
                    />
                  )}
                </div>
              </RowCard>
            );
          })}
        </RowList>
      )}

      <RecordDialog
        open={inviting}
        onOpenChange={setInviting}
        title="Give someone access"
        description="They sign in with Clerk using this exact email address, and pick up the role you set here."
        fields={inviteFields}
        initial={{ name: "", email: "", role: "viewer" } as Values}
        onSubmit={async (values) => {
          await invite(values as never);
          toast.success("Access granted. Ask them to sign in.");
        }}
        submitLabel="Grant access"
      />
    </>
  );
}
