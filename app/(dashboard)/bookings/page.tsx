"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { MailIcon, PhoneIcon, SearchIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNaira, todayISO } from "@/lib/format";
import { atLeast } from "@/lib/roles";

const STATUSES = [
  "pending",
  "confirmed",
  "checked-in",
  "completed",
  "cancelled",
] as const;

type Status = (typeof STATUSES)[number];
type Booking = Doc<"bookings">;

const FILTERS = ["All", ...STATUSES] as const;

export default function BookingsPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "editor");

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const { results, status, loadMore } = usePaginatedQuery(
    api.bookings.page,
    filter === "All" ? {} : { status: filter },
    { initialNumItems: 20 },
  );

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Every booking made on the website, newest first. No card details are stored anywhere."
        action={
          <div className="w-44">
            <Select
              items={FILTERS.map((value) => ({ value, label: value }))}
              value={filter}
              onValueChange={(value) => setFilter(value as (typeof FILTERS)[number])}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "All" ? "All statuses" : value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <CheckInPanel canEdit={canEdit} />

      {status === "LoadingFirstPage" ? (
        <ListSkeleton />
      ) : results.length === 0 ? (
        <EmptyState
          title="No reservations here"
          description={
            filter === "All"
              ? "Bookings appear the moment a guest completes the flow on the website."
              : `Nothing with the status "${filter}".`
          }
        />
      ) : (
        <>
          <RowList>
            {results.map((booking) => (
              <BookingRow key={booking._id} booking={booking} canEdit={canEdit} />
            ))}
          </RowList>

          {status === "CanLoadMore" && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => loadMore(20)}>
                Load more
              </Button>
            </div>
          )}
          {status === "LoadingMore" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">Loading…</p>
          )}
        </>
      )}
    </>
  );
}

/**
 * The front desk: a guest arrives with their reference code, staff type it in
 * and confirm the arrival without hunting through the paged list below.
 */
function CheckInPanel({ canEdit }: { canEdit: boolean }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const setStatus = useMutation(api.bookings.setStatus);

  const booking = useQuery(api.bookings.byReference, query ? { reference: query } : "skip");
  const loading = query !== "" && booking === undefined;

  // Early and late arrivals are routine, so a date mismatch is a warning the
  // desk can read and override — never a block.
  const warning = !booking
    ? null
    : booking.status === "cancelled"
      ? "This reservation was cancelled. Check with the guest before admitting them."
      : booking.status === "checked-in"
        ? "This guest is already checked in."
        : booking.status === "completed"
          ? "This stay is already marked completed."
          : booking.checkIn !== todayISO()
            ? `Check-in date is ${formatDate(booking.checkIn)}, not today.`
            : null;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Check in a guest</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Enter the reference code the guest booked with, for example PHS-4KQ7WM.
      </p>

      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(draft.trim().toUpperCase());
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="PHS-XXXXXX"
          aria-label="Booking reference"
          autoComplete="off"
          className="numeric h-10 w-full uppercase sm:w-56"
        />
        <Button type="submit" disabled={!draft.trim()}>
          <SearchIcon className="size-4" />
          Find
        </Button>
        {query && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft("");
              setQuery("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {loading && <p className="mt-3 text-sm text-muted-foreground">Looking up {query}…</p>}

      {query !== "" && booking === null && (
        <p className="mt-3 text-sm text-muted-foreground">
          No reservation with the reference <span className="numeric font-semibold">{query}</span>.
          Check for a typo, or search the list below.
        </p>
      )}

      {booking && (
        <div className="mt-4 flex flex-wrap items-start gap-4 border-t border-border pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="numeric font-bold">{booking.reference}</span>
              <Badge variant={booking.status === "cancelled" ? "outline" : "secondary"}>
                {booking.status}
              </Badge>
            </div>
            <p className="mt-1 font-semibold">
              {`${booking.guest.firstName} ${booking.guest.lastName}`.trim()}
            </p>
            <p className="numeric text-sm text-muted-foreground">
              {booking.roomName} · {booking.roomCount} room
              {booking.roomCount === 1 ? "" : "s"} · {formatDate(booking.checkIn)} →{" "}
              {formatDate(booking.checkOut)} · {booking.adults} adult
              {booking.adults === 1 ? "" : "s"}
              {booking.children ? `, ${booking.children} children` : ""}
            </p>
            <p className="numeric mt-1 text-sm font-semibold">{formatNaira(booking.total)}</p>
            {warning && <p className="mt-2 text-sm font-medium text-destructive">{warning}</p>}
          </div>

          <Button
            disabled={!canEdit || busy || booking.status === "checked-in"}
            onClick={async () => {
              setBusy(true);
              try {
                await setStatus({ id: booking._id, status: "checked-in" });
                toast.success(`${booking.reference} checked in.`);
              } catch (error) {
                toast.error(cleanError(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            {booking.status === "checked-in" ? "Checked in" : "Confirm check-in"}
          </Button>
        </div>
      )}
    </section>
  );
}

function BookingRow({ booking, canEdit }: { booking: Booking; canEdit: boolean }) {
  const setStatus = useMutation(api.bookings.setStatus);
  const setNote = useMutation(api.bookings.setNote);
  const remove = useMutation(api.bookings.remove);
  const [open, setOpen] = useState(false);

  const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`.trim();

  return (
    <RowCard className="flex-col items-stretch">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="numeric font-bold">{booking.reference}</span>
            <Badge variant={booking.status === "cancelled" ? "outline" : "secondary"}>
              {booking.status}
            </Badge>
            {booking.promoCode && (
              <Badge variant="outline" className="numeric">
                {booking.promoCode}
              </Badge>
            )}
          </div>
          <p className="mt-1 font-semibold">{guestName}</p>
          <p className="numeric text-sm text-muted-foreground">
            {booking.roomName} · {booking.roomCount} room
            {booking.roomCount === 1 ? "" : "s"} · {formatDate(booking.checkIn)} →{" "}
            {formatDate(booking.checkOut)} · {booking.nights} night
            {booking.nights === 1 ? "" : "s"} · {booking.adults} adult
            {booking.adults === 1 ? "" : "s"}
            {booking.children ? `, ${booking.children} children` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="numeric text-lg font-extrabold">{formatNaira(booking.total)}</p>
          <p className="text-xs text-muted-foreground">Total, tax included</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              items={STATUSES.map((value) => ({ value, label: value }))}
              value={booking.status}
              onValueChange={async (value) => {
                try {
                  await setStatus({ id: booking._id, status: value as Status });
                  toast.success(`${booking.reference} is now ${value}.`);
                } catch (error) {
                  toast.error(cleanError(error));
                }
              }}
            >
              <SelectTrigger className="h-9 w-full" disabled={!canEdit}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide" : "Details"}
          </Button>
          {canEdit && (
            <DeleteButton
              label={booking.reference}
              description="The reservation record is deleted permanently. Cancel it instead if the guest may return."
              onConfirm={() => remove({ id: booking._id })}
            />
          )}
        </div>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <dl className="space-y-1 text-sm">
            <Detail label="Email">
              <a className="hover:underline" href={`mailto:${booking.guest.email}`}>
                <MailIcon className="mr-1 inline size-3.5" />
                {booking.guest.email}
              </a>
            </Detail>
            <Detail label="Phone">
              <a className="hover:underline" href={`tel:${booking.guest.phone}`}>
                <PhoneIcon className="mr-1 inline size-3.5" />
                {booking.guest.phone}
              </a>
            </Detail>
            <Detail label="Country">{booking.guest.country || "—"}</Detail>
            <Detail label="Arrival">{booking.guest.arrivalTime || "Not given"}</Detail>
            <Detail label="Extras">
              {booking.extras.length ? booking.extras.join(", ") : "None"}
            </Detail>
            <Detail label="Requests">
              {booking.guest.specialRequests || "None"}
            </Detail>
          </dl>

          <div>
            <label
              className="eyebrow mb-2 block"
              htmlFor={`note-${booking._id}`}
            >
              Internal note
            </label>
            <Textarea
              id={`note-${booking._id}`}
              rows={5}
              defaultValue={booking.note ?? ""}
              disabled={!canEdit}
              placeholder="Visible to staff only — never sent to the guest."
              onBlur={async (event) => {
                if (event.target.value === (booking.note ?? "")) return;
                try {
                  await setNote({ id: booking._id, note: event.target.value });
                  toast.success("Note saved.");
                } catch (error) {
                  toast.error(cleanError(error));
                }
              }}
            />
          </div>
        </div>
      )}
    </RowCard>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
