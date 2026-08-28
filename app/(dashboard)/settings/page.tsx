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
  { name: "checkIn", label: "Check-in from", kind: "text" },
  { name: "checkOut", label: "Check-out by", kind: "text" },
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
    setValues(rest);
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
