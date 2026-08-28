"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  BedDouble,
  CalendarCheck,
  Images,
  Inbox,
  Newspaper,
  Tags,
  Wallet,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { useViewer } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNaira, formatNairaCompact, todayISO } from "@/lib/format";

/** The landing screen: what needs attention today, and what the site is showing. */
export default function OverviewPage() {
  const viewer = useViewer();
  const stats = useQuery(api.stats.overview, { today: todayISO() });

  const firstName = viewer.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Good day, ${firstName}`}
        description="Everything the website is currently showing, and everything guests have sent in."
      />

      {stats === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              href="/messages"
              icon={<Inbox className="size-4" />}
              label="Unread enquiries"
              value={stats.unreadMessages > 99 ? "99+" : String(stats.unreadMessages)}
              tone={stats.unreadMessages > 0 ? "brand" : "muted"}
              note={stats.unreadMessages ? "Waiting for a reply" : "Inbox is clear"}
            />
            <Stat
              href="/bookings"
              icon={<CalendarCheck className="size-4" />}
              label="Upcoming stays"
              value={String(stats.upcomingStays)}
              note="Checking in from today"
            />
            <Stat
              href="/bookings"
              icon={<Wallet className="size-4" />}
              label="Booked revenue"
              value={formatNairaCompact(stats.upcomingRevenue)}
              note="Upcoming, excluding cancellations"
            />
            <Stat
              href="/rooms"
              icon={<BedDouble className="size-4" />}
              label="Rooms live"
              value={`${stats.rooms.published}/${stats.rooms.total}`}
              note="Published on the website"
            />
            <Stat
              href="/offers"
              icon={<Tags className="size-4" />}
              label="Offers live"
              value={`${stats.offers.published}/${stats.offers.total}`}
              note="Packages and promotions"
            />
            <Stat
              href="/journal"
              icon={<Newspaper className="size-4" />}
              label="Journal posts"
              value={`${stats.posts.published}/${stats.posts.total}`}
              note="Published articles"
            />
            <Stat
              href="/gallery"
              icon={<Images className="size-4" />}
              label="Gallery images"
              value={String(stats.galleryCount)}
              note="In Convex storage"
            />
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-extrabold">Latest reservations</h2>
            {stats.recentBookings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                No reservations yet. They appear here the moment a guest books on
                the website.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.recentBookings.map((booking) => (
                  <li
                    key={booking._id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <span className="numeric font-bold">{booking.reference}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {booking.guest} · {booking.roomName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(booking.checkIn)} · {booking.nights}{" "}
                      {booking.nights === 1 ? "night" : "nights"}
                    </span>
                    <span className="numeric text-sm font-semibold">
                      {formatNaira(booking.total)}
                    </span>
                    <Badge
                      variant={booking.status === "cancelled" ? "outline" : "secondary"}
                    >
                      {booking.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Stat({
  href,
  icon,
  label,
  value,
  note,
  tone = "default",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone?: "default" | "brand" | "muted";
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand"
    >
      <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        <span className={tone === "brand" ? "text-brand" : undefined}>{icon}</span>
        {label}
      </p>
      <p className="numeric mt-2 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </Link>
  );
}
