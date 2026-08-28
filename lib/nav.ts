import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  CalendarCheck,
  ConciergeBell,
  Images,
  Inbox,
  LayoutDashboard,
  MapPin,
  MessageSquareQuote,
  Newspaper,
  PartyPopper,
  Settings,
  Sparkles,
  Tags,
  UsersRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import type { Role } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Minimum role that may open the screen. */
  minimum?: Role;
  /** Shows the unread-messages count. */
  badge?: "messages";
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    label: "Front desk",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/bookings", label: "Reservations", icon: CalendarCheck },
      { href: "/messages", label: "Enquiries", icon: Inbox, badge: "messages" },
      { href: "/subscribers", label: "Newsletter", icon: UsersRound },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/rooms", label: "Rooms", icon: BedDouble },
      { href: "/offers", label: "Offers", icon: Tags },
      { href: "/gallery", label: "Gallery", icon: Images },
      { href: "/dining", label: "Dining", icon: UtensilsCrossed },
      { href: "/events", label: "Event spaces", icon: PartyPopper },
      { href: "/facilities", label: "Facilities", icon: Sparkles },
      { href: "/services", label: "Services & nearby", icon: ConciergeBell },
      { href: "/reviews", label: "Reviews", icon: MessageSquareQuote },
      { href: "/faqs", label: "FAQs", icon: MapPin },
      { href: "/journal", label: "Journal", icon: Newspaper },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/pricing", label: "Extras & promos", icon: Wallet, minimum: "editor" },
      { href: "/staff", label: "Staff", icon: UsersRound, minimum: "admin" },
      { href: "/settings", label: "Settings", icon: Settings, minimum: "admin" },
    ],
  },
];
