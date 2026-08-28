"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { navigation } from "@/lib/nav";
import { atLeast, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

/**
 * The one navigation list, rendered both in the desktop rail and inside the
 * mobile tray. `onNavigate` lets the tray close itself on selection.
 */
export function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const unread = useQuery(api.messages.unreadCount, {});

  return (
    <nav className="flex flex-col gap-6" aria-label="Dashboard">
      {navigation.map((section) => {
        const items = section.items.filter(
          (item) => !item.minimum || atLeast(role, item.minimum),
        );
        if (!items.length) return null;

        return (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="eyebrow px-3 pb-1">{section.label}</p>
            {items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const count = item.badge === "messages" ? unread : undefined;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn("size-4", active && "text-brand")}
                    aria-hidden
                  />
                  <span className="flex-1">{item.label}</span>
                  {count ? (
                    <span className="numeric rounded-full bg-brand px-2 py-0.5 text-[0.7rem] font-bold text-brand-foreground">
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
