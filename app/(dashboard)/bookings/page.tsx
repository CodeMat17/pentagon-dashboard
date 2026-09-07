"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ClockIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
} from "lucide-react";
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
import { TimeField, cleanError } from "@/components/dashboard/record-form";
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
import {
  formatDate,
  formatDateTime,
  formatHold,
  formatNaira,
  formatTime12,
  holdCountdown,
  todayInLagos,
} from "@/lib/format";
import { atLeast } from "@/lib/roles";

const STATUSES = [
  "pending",
  "confirmed",
  "checked-in",
  "completed",
  "cancelled",
  "no-show",
] as const;

type Status = (typeof STATUSES)[number];
type Booking = Doc<"bookings">;

const FILTERS = ["All", ...STATUSES] as const;

/** Statuses that mean this reservation will not become a stay. */
const DEAD: ReadonlySet<string> = new Set(["cancelled", "no-show"]);

const RESENDABLE = [
  { kind: "confirmation", label: "Confirmation" },
  { kind: "reminder-day-before", label: "Day-before reminder" },
  { kind: "reminder-arrival", label: "Arrival-day welcome" },
] as const;

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
        description="Every booking made on the website, newest first. Nothing is paid online — each of these is a room held against a name and settled at the hotel."
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

      <ArrivalsPanel canEdit={canEdit} />
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
 * Today's holds.
 *
 * With no deposit taken, the only thing between a reservation and an empty room
 * is the hold — so the desk needs to see, at a glance, who is still expected and
 * how long each room stays theirs. Rooms are released automatically an hour at a
 * time, but a guest who calls ahead should keep theirs: "Hold 2 more hours" is
 * the button that makes the policy humane.
 */
function ArrivalsPanel({ canEdit }: { canEdit: boolean }) {
  const today = todayInLagos();
  const arrivals = useQuery(api.bookings.arrivalsToday, { today });
  const setHoldUntil = useMutation(api.bookings.setHoldUntil);
  const setStatus = useMutation(api.bookings.setStatus);

  if (!arrivals || arrivals.length === 0) return null;

  async function extend(id: Booking["_id"], holdUntil: string, hours: number) {
    const at = Date.parse(`${holdUntil}:00+01:00`) + hours * 3_600_000;
    // Back to Nigerian local time, and back into `yyyy-mm-ddThh:mm`.
    const next = new Date(at + 3_600_000).toISOString().slice(0, 16);
    try {
      await setHoldUntil({ id, holdUntil: next });
      toast.success(`Room held until ${next.split("T")[1]}.`);
    } catch (error) {
      toast.error(cleanError(error));
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Arriving today · {formatDate(today)}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Rooms are released automatically once a hold expires. If a guest calls to say
        they are running late, extend the hold instead of letting it lapse.
      </p>

      <ul className="mt-3 divide-y divide-border">
        {arrivals.map((arrival) => {
          const countdown = holdCountdown(arrival.holdUntil);
          const expired = countdown.startsWith("expired");
          return (
            <li key={arrival._id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="numeric font-bold">{arrival.reference}</span>
                  <span className="font-semibold">{arrival.guest}</span>
                </div>
                <p className="numeric text-sm text-muted-foreground">
                  {arrival.roomName} · {arrival.nights} night
                  {arrival.nights === 1 ? "" : "s"} · {arrival.phone}
                </p>
              </div>

              <p
                className={`numeric flex items-center gap-1.5 text-sm font-semibold ${
                  expired ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <ClockIcon className="size-3.5" />
                Held to {formatHold(arrival.holdUntil).split(",")[0]} ({countdown})
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canEdit}
                  onClick={() => void extend(arrival._id, arrival.holdUntil, 2)}
                >
                  Hold 2 more hours
                </Button>
                <Button
                  size="sm"
                  disabled={!canEdit}
                  onClick={async () => {
                    try {
                      await setStatus({ id: arrival._id, status: "checked-in" });
                      toast.success(`${arrival.reference} checked in.`);
                    } catch (error) {
                      toast.error(cleanError(error));
                    }
                  }}
                >
                  Check in
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
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
      : booking.status === "no-show"
        ? "This reservation was released as a no-show. The room may have been resold — check availability before admitting them."
        : booking.status === "checked-in"
          ? "This guest is already checked in."
          : booking.status === "completed"
            ? "This stay is already marked completed."
            : booking.checkIn !== todayInLagos()
              ? `Check-in date is ${formatDate(booking.checkIn)}, not today.`
              : null;

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold">Check in a guest</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Enter the reference code the guest booked with, for example PIHS-4KQ7WM.
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
          placeholder="PIHS-XXXXXX"
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
              <StatusBadge status={booking.status} />
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
            <p className="numeric mt-1 text-sm font-semibold">
              {formatNaira(booking.total)} · to collect at the desk
            </p>
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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={DEAD.has(status) ? "outline" : "secondary"}>{status}</Badge>
  );
}

function BookingRow({ booking, canEdit }: { booking: Booking; canEdit: boolean }) {
  const setStatus = useMutation(api.bookings.setStatus);
  const setNote = useMutation(api.bookings.setNote);
  const setHoldUntil = useMutation(api.bookings.setHoldUntil);
  const resend = useMutation(api.bookings.resend);
  const remove = useMutation(api.bookings.remove);
  const [open, setOpen] = useState(false);

  const guestName = `${booking.guest.firstName} ${booking.guest.lastName}`.trim();
  const notifications = booking.notifications ?? [];

  return (
    <RowCard className="flex-col items-stretch">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="numeric font-bold">{booking.reference}</span>
            <StatusBadge status={booking.status} />
            <Badge variant="outline">Pay at hotel</Badge>
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
          <p className="text-xs text-muted-foreground">Due at the hotel, tax included</p>
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
              {booking.guest.email ? (
                <a className="hover:underline" href={`mailto:${booking.guest.email}`}>
                  <MailIcon className="mr-1 inline size-3.5" />
                  {booking.guest.email}
                </a>
              ) : (
                <span className="text-muted-foreground">
                  Not given — SMS only
                </span>
              )}
            </Detail>
            <Detail label="Phone">
              <a className="hover:underline" href={`tel:${booking.guest.phone}`}>
                <PhoneIcon className="mr-1 inline size-3.5" />
                {booking.guest.phone}
              </a>
            </Detail>
            <Detail label="Country">{booking.guest.country || "—"}</Detail>
            <Detail label="Arrival">
              {booking.guest.arrivalTime
                ? formatTime12(booking.guest.arrivalTime)
                : "Not given"}
            </Detail>
            <Detail label="Room held to">
              {booking.holdUntil ? (
                <span className="numeric">
                  {formatHold(booking.holdUntil)}
                  {canEdit && (
                    <HoldEditor
                      holdUntil={booking.holdUntil}
                      onChange={async (next) => {
                        if (next === booking.holdUntil) return;
                        try {
                          await setHoldUntil({ id: booking._id, holdUntil: next });
                          toast.success("Hold updated.");
                        } catch (error) {
                          toast.error(cleanError(error));
                        }
                      }}
                    />
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </Detail>
            <Detail label="Extras">
              {booking.extras.length ? booking.extras.join(", ") : "None"}
            </Detail>
            <Detail label="Requests">{booking.guest.specialRequests || "None"}</Detail>
          </dl>

          <div className="space-y-4">
            <div>
              <label className="eyebrow mb-2 block" htmlFor={`note-${booking._id}`}>
                Internal note
              </label>
              <Textarea
                id={`note-${booking._id}`}
                rows={4}
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

            <div>
              <p className="eyebrow mb-2">Messages sent</p>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing sent yet. Confirmations go out seconds after a booking is made.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {[...notifications].reverse().map((entry, index) => (
                    <li key={index} className="flex flex-wrap items-center gap-2">
                      {entry.channel === "email" ? (
                        <MailIcon className="size-3.5 shrink-0" />
                      ) : (
                        <MessageCircleIcon className="size-3.5 shrink-0" />
                      )}
                      <span className="font-medium">{entry.kind}</span>
                      <Badge
                        variant={entry.status === "sent" ? "secondary" : "outline"}
                        className={entry.status === "failed" ? "text-destructive" : ""}
                      >
                        {entry.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.at)}
                      </span>
                      {entry.status !== "sent" && (
                        <span className="w-full text-xs text-muted-foreground">
                          {entry.detail}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {RESENDABLE.map(({ kind, label }) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await resend({ id: booking._id, kind });
                          toast.success(`${label} queued for ${booking.reference}.`);
                        } catch (error) {
                          toast.error(cleanError(error));
                        }
                      }}
                    >
                      <SendIcon className="size-3.5" />
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </RowCard>
  );
}

/**
 * Editing when a room stops being held: a date, and a time read in am/pm.
 *
 * A native `datetime-local` would be one control instead of two, but its clock
 * follows the browser's locale — a laptop set to en-GB shows the desk 20:00 no
 * matter what this dashboard prefers. Splitting it puts the 12-hour reading
 * under our control while the value stays the `yyyy-mm-ddThh:mm` Convex
 * validates.
 */
function HoldEditor({
  holdUntil,
  onChange,
}: {
  holdUntil: string;
  onChange: (next: string) => void | Promise<void>;
}) {
  const [date, time] = holdUntil.split("T");

  return (
    <span className="mt-1 flex gap-2">
      <Input
        type="date"
        aria-label="Hold date"
        defaultValue={date}
        className="numeric h-9 w-40"
        onBlur={(event) => {
          const next = event.target.value;
          if (next) void onChange(`${next}T${time}`);
        }}
      />
      <TimeField
        id={`hold-time-${holdUntil}`}
        ariaLabel="Hold time"
        value={time}
        onChange={(next) => void onChange(`${date}T${next}`)}
      />
    </span>
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
