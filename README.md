# Pentagon Hotel — Dashboard

The staff dashboard for Pentagon Hotel and Suites. It owns the Convex backend that
the public website reads from.

- **Clerk** authenticates. **Convex** authorizes — a Clerk account grants nothing
  until an admin gives it a role in the `users` table.
- **Convex storage** holds every photograph. Deleting or replacing an image deletes
  the file, so the bucket never drifts from the database.
- **Nunito** is the only typeface, and the palette is the website's — so an editor
  can see what a change will look like before it ships.

---

## First run

```bash
yarn install
npx convex dev          # creates the deployment, writes CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL
```

Then, in the Clerk dashboard:

1. Create the application and copy the API keys into `.env.local`
   (see [.env.example](.env.example)).
2. **Configure → JWT templates → New template → Convex.** Leave the name as
   `convex`; that is the name Convex looks for.
3. Copy the template's Issuer URL and set it on the *Convex* deployment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-subdomain>.clerk.accounts.dev
```

Finally:

```bash
yarn dev
```

The **first person to sign in becomes the owner**. Everyone after that lands on
"no dashboard access yet" until an owner or admin adds them under **Staff**.

To load the website's original content — rooms, offers, dining, gallery and the
rest, with every photograph copied into Convex storage — open **Settings → Import
content**, or run:

```bash
npx convex run seed:run '{"confirm":"REPLACE ALL CONTENT"}'
```

---

## Roles

| Role | Can |
|---|---|
| **Viewer** | Read content, reservations and enquiries. |
| **Editor** | Everything above, plus create/edit/delete content and manage reservations. |
| **Admin** | Everything above, plus staff, settings and deleting promo codes. |
| **Owner** | Everything. Cannot be demoted, deactivated or removed. |

The UI hides what a role cannot do; Convex re-checks every mutation, so hiding a
button is a courtesy and never the control.

---

## Layout

```
convex/            The backend — schema, queries, mutations, storage, seed
app/(dashboard)/   Every screen, inside the authenticated shell
components/dashboard/
  shell.tsx        Auth gate, sidebar, viewer context
  record-form.tsx  The declarative form engine every editing screen uses
  image-input.tsx  Browser → Convex storage uploads
  list.tsx         Row cards, empty states, delete confirmation
lib/               Roles, navigation, formatting
```

### Why the forms are declarative

Sixteen content types with bespoke forms would be sixteen places to keep in sync
with the Convex validators. Instead each screen declares its fields as data and
`RecordDialog` renders them. The Convex validators stay the single contract; a new
field is one line here and one line in `convex/schema.ts`.

### Read-path notes

- Image URLs are denormalised onto the row at upload time, so no list query awaits
  `ctx.storage.getUrl` — a 40-image gallery is one index scan, not 41 round trips.
- Every query goes through an index; there are no full-table `filter()` scans.
- Reservations, enquiries and subscribers are paginated, because those tables grow
  forever. The overview tiles cap their reads with `.take()`.
