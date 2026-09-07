"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { useViewer } from "@/components/dashboard/shell";
import {
  FieldGrid,
  cleanError,
  type Field,
  type Values,
} from "@/components/dashboard/record-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { atLeast } from "@/lib/roles";

const fields: readonly Field[] = [
  { name: "phone", label: "Phone", kind: "text" },
  { name: "whatsapp", label: "WhatsApp number", kind: "text", hint: "E.164 without +, e.g. 2348033833628." },
  { name: "email", label: "General email", kind: "text" },
  { name: "reservationsEmail", label: "Reservations email", kind: "text" },
  { name: "address", label: "Address", kind: "textarea", rows: 2 },
  { name: "checkIn", label: "Check-in from", kind: "time" },
  { name: "checkOut", label: "Check-out by", kind: "time" },
  { name: "vatRate", label: "VAT rate", kind: "percent", hint: "0.075 = 7.5%." },
  { name: "serviceRate", label: "Service charge", kind: "percent", hint: "0.05 = 5%." },
  {
    name: "announcement",
    label: "Site announcement",
    kind: "textarea",
    rows: 2,
    hint: "Shown as a banner across the website when switched on.",
  },
  { name: "announcementActive", label: "Show the announcement", kind: "switch" },
  {
    name: "bookingsOpen",
    label: "Accept online bookings",
    kind: "switch",
    hint: "Turning this off stops the website taking new reservations immediately.",
  },
  {
    name: "holdUntilTime",
    label: "Hold rooms until",
    kind: "time",
    hint: "A time on the arrival date, e.g. 8:00 pm. After it passes, an unclaimed reservation becomes a no-show and the room is released automatically.",
  },
  {
    name: "cancellationPolicy",
    label: "Cancellation policy",
    kind: "textarea",
    rows: 3,
    hint: "Shown before the guest confirms, in the confirmation email, and on their reservation page.",
  },
  {
    name: "noShowPolicy",
    label: "No-show policy",
    kind: "textarea",
    rows: 3,
    hint: "How the hold works, in the guest's own words. Say plainly what happens if they neither arrive nor call.",
  },
  {
    name: "remindersEnabled",
    label: "Send stay reminders",
    kind: "switch",
    hint: "One message the evening before arrival, one on the day. These are what stop reservations being forgotten.",
  },
  {
    name: "smsEnabled",
    label: "Send confirmation SMS",
    kind: "switch",
    hint: "One text when a booking is made and one if it is cancelled — SMS is billed per message, so reminders are email only. Off falls back to email alone.",
  },
];

const DEFAULTS: Values = {
  phone: "",
  whatsapp: "",
  email: "",
  reservationsEmail: "",
  address: "",
  checkIn: "14:00",
  checkOut: "12:00",
  vatRate: 0.075,
  serviceRate: 0.05,
  announcement: "",
  announcementActive: false,
  bookingsOpen: true,
  holdUntilTime: "20:00",
  cancellationPolicy:
    "Cancel free of charge up to 24 hours before your arrival date. Inside 24 hours, one night may be charged.",
  noShowPolicy:
    "Your room is held until 8:00 pm on your arrival date. If you have not arrived or contacted us by then, the reservation is released and the room offered to other guests. Call or WhatsApp us any time if you are running late — we will hold it for you.",
  remindersEnabled: true,
  smsEnabled: true,
};

export default function SettingsPage() {
  const viewer = useViewer();
  const canEdit = atLeast(viewer.role, "admin");

  const settings = useQuery(api.settings.get, {});
  const save = useMutation(api.settings.save);

  const [values, setValues] = useState<Values>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  // Seed the form the first time the saved settings arrive, and again if another
  // admin saves while this screen is open. Adjusting state during render keeps
  // that out of an effect.
  const [seed, setSeed] = useState(settings);
  if (settings && seed !== settings) {
    setSeed(settings);
    const { _id, _creationTime, key, ...rest } = settings;
    void _id;
    void _creationTime;
    void key;
    // The policy fields were added after the first release, so a row saved
    // before them has holes. Layering onto DEFAULTS fills them rather than
    // clearing the form.
    setValues({ ...DEFAULTS, ...rest });
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Contact details, tax rates and the switches that change what the website will accept."
      />

      {settings === undefined ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <form
          className="max-w-3xl space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            try {
              await save(values as never);
              toast.success("Settings saved.");
            } catch (error) {
              toast.error(cleanError(error));
            } finally {
              setSaving(false);
            }
          }}
        >
          <FieldGrid fields={fields} values={values} onChange={setValues} />

          <Button type="submit" disabled={!canEdit || saving}>
            {saving ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
            Save settings
          </Button>
        </form>
      )}

      {atLeast(viewer.role, "admin") && <ImportCard />}
    </>
  );
}

/**
 * One-time import of the website's original hard-coded content, including
 * downloading every stock photograph into Convex storage. Destructive by design,
 * and behind a typed confirmation.
 */
function ImportCard() {
  const seed = useAction(api.seed.run);
  const [running, setRunning] = useState(false);

  return (
    <section className="mt-12 max-w-3xl rounded-xl border border-destructive/40 p-5">
      <h2 className="font-extrabold">Import the original website content</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Replaces every content table — rooms, offers, dining, event spaces,
        facilities, services, reviews, FAQs, gallery and journal — with the content
        the site shipped with, and copies each photograph into Convex storage.
        Reservations, enquiries, subscribers and staff are never touched.
      </p>
      <p className="mt-2 text-sm font-semibold">
        Run this once, on a fresh deployment. Running it again discards any content
        edits made since.
      </p>

      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" className="mt-4" disabled={running} />}
        >
          {running && <LoaderCircleIcon className="animate-spin" />}
          {running ? "Importing…" : "Import content"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all content?</AlertDialogTitle>
            <AlertDialogDescription>
              Every content row and its stored images are deleted and rebuilt from
              the original data. This takes a minute or so while the photographs
              download. Guest data is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setRunning(true);
                toast.info("Importing — this takes a minute.");
                try {
                  const result = await seed({ confirm: "REPLACE ALL CONTENT" });
                  toast.success(
                    `Imported ${result.tables} content types and ${result.uploaded} images.`,
                  );
                } catch (error) {
                  toast.error(cleanError(error));
                } finally {
                  setRunning(false);
                }
              }}
            >
              Yes, replace everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
