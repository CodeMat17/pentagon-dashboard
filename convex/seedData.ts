/**
 * Content layer for the whole site.
 *
 * Every page and every JSON-LD block reads from here, so swapping in a CMS or a
 * PMS later means replacing these exported functions — not the UI.
 *
 * NOTE ON IMAGERY: the `src` values point at Unsplash and are stand-ins for the
 * hotel's own photography. Replace them with real assets (ideally local files in
 * /public so Next can generate blur placeholders automatically) before launch.
 */

const U = "https://images.unsplash.com/photo-";
/**
 * Unsplash delivery params. The `w` cap matters: without it Unsplash serves the
 * full-resolution original (often 5000px+), which next/image then has to
 * download before it can resize. 1600px is larger than any slot on the site.
 */
const P = "?auto=format&fit=crop&q=75&w=1600";
const img = (id: string) => `${U}${id}${P}`;

/* ------------------------------------------------------------------ rooms */

export type BedType = "King" | "Queen" | "Twin" | "Double";
export type RoomCategory = "Standard" | "Deluxe" | "Executive" | "Suite" | "Family";

export interface RoomImage {
  src: string;
  alt: string;
}

export interface Room {
  slug: string;
  name: string;
  category: RoomCategory;
  tagline: string;
  description: string;
  /** Longer copy for the detail page. */
  longDescription: string[];
  sizeSqm: number;
  bed: BedType;
  maxAdults: number;
  maxChildren: number;
  view: string;
  bathroom: string;
  amenities: string[];
  images: RoomImage[];
  /** Nightly rate in naira, before tax and service charge. */
  rate: number;
  /** Struck-through reference rate, when the direct rate beats it. */
  rackRate?: number;
  accessible: boolean;
  /** Rooms of this type in inventory — drives the mock availability check. */
  inventory: number;
  featured: boolean;
  cancellation: string;
}

export const rooms: Room[] = [
  {
    slug: "standard-queen-room",
    name: "Standard Queen Room",
    category: "Standard",
    tagline: "Everything you need, nothing you don't",
    description:
      "A calm, well-proportioned room with a queen bed, work desk and a rain shower — our best value for a short stay in Choba.",
    longDescription: [
      "The Standard Queen is the room we designed for the guest who is here to get things done and sleep well. Blackout curtains, a genuinely quiet split-unit air conditioner, and a mattress we replaced across the whole floor in 2024.",
      "The desk seats one comfortably with two power outlets and a USB-C port at hand height. Fibre Wi-Fi reaches 80 Mbps in-room, and the backup generator carries the whole building, so a power cut never interrupts a call.",
    ],
    sizeSqm: 24,
    bed: "Queen",
    maxAdults: 2,
    maxChildren: 1,
    view: "Courtyard",
    bathroom: "Private en-suite with rain shower, hot water 24/7",
    amenities: [
      "Free fibre Wi-Fi",
      "Split-unit air conditioning",
      "43\" smart TV with DStv",
      "Work desk & ergonomic chair",
      "Rain shower",
      "Complimentary toiletries",
      "Electronic safe",
      "Mini fridge",
      "Daily housekeeping",
      "24-hour power",
    ],
    images: [
      { src: img("1566073771259-6a8506099945"), alt: "Standard Queen room with a made queen bed and warm bedside lighting" },
      { src: img("1590490360182-c33d57733427"), alt: "The Standard Queen work desk beside a window" },
      { src: img("1552321554-5fefe8c9ef14"), alt: "En-suite bathroom with a walk-in rain shower" },
    ],
    rate: 20000,
    accessible: false,
    inventory: 14,
    featured: false,
    cancellation: "Free cancellation until 24 hours before arrival.",
  },
  {
    slug: "standard-king-room",
    name: "Standard King Room",
    category: "Standard",
    tagline: "A king bed at the standard rate",
    description:
      "The same well-judged standard room with a king bed instead of a queen — the one to book when the only thing you want more of is bed.",
    longDescription: [
      "The Standard King is laid out like the Standard Queen but gives the bed the floor space instead of the seating: a full king, two bedside tables, and reading lights you can angle without waking the other side of the bed.",
      "Blackout curtains, a quiet split-unit air conditioner and 24-hour power from the house generator. The desk is compact but real — a laptop, a notebook and a cup of coffee all fit at once.",
    ],
    sizeSqm: 26,
    bed: "King",
    maxAdults: 2,
    maxChildren: 1,
    view: "Courtyard or street",
    bathroom: "Private en-suite with rain shower, hot water 24/7",
    amenities: [
      "Free fibre Wi-Fi",
      "Split-unit air conditioning",
      "43\" smart TV with DStv",
      "King bed",
      "Work desk",
      "Rain shower",
      "Electronic safe",
      "Mini fridge",
      "Daily housekeeping",
      "24-hour power",
    ],
    images: [
      { src: img("1505693416388-ac5ce068fe85"), alt: "Standard King room with a king bed and bedside lamps" },
      { src: img("1586023492125-27b2c045efd7"), alt: "Standard King room seating and desk" },
    ],
    rate: 20000,
    accessible: false,
    inventory: 12,
    featured: false,
    cancellation: "Free cancellation until 24 hours before arrival.",
  },
  {
    slug: "double-queen-room",
    name: "Double Queen Room",
    category: "Deluxe",
    tagline: "Two queen beds, no negotiation",
    description:
      "Two full queen beds, a shared desk and an en-suite shower — built for colleagues travelling together, families of three and crews on rotation.",
    longDescription: [
      "The Double Queen has two proper queen beds rather than the narrow singles most hotels call twins. Each has its own bedside table, reading light and power outlets, so nobody has to negotiate over a charger.",
      "It is the room families of three ask for and the room companies book for staff on rotation. Corporate and crew rates apply from three consecutive nights — reservations will apply them automatically when you book direct.",
    ],
    sizeSqm: 30,
    bed: "Queen",
    maxAdults: 3,
    maxChildren: 2,
    view: "Courtyard",
    bathroom: "Private en-suite with rain shower",
    amenities: [
      "Two queen beds",
      "Free fibre Wi-Fi",
      "Split-unit air conditioning",
      "43\" smart TV with DStv",
      "Shared work desk",
      "Electronic safe",
      "Mini fridge",
      "Crew & corporate rates available",
      "24-hour power",
    ],
    images: [
      { src: img("1631679706909-1844bbd07221"), alt: "Double Queen room with two queen beds" },
      { src: img("1586023492125-27b2c045efd7"), alt: "Double Queen room desk and seating" },
    ],
    rate: 25000,
    accessible: false,
    inventory: 10,
    featured: false,
    cancellation: "Free cancellation until 24 hours before arrival.",
  },
  {
    slug: "family-spring-room",
    name: "Family Spring Room",
    category: "Family",
    tagline: "Room for everybody",
    description:
      "A larger room on sprung mattresses with space for a family of four, a seating corner and a bath that fits a toddler and a rubber duck.",
    longDescription: [
      "The Family Spring Room is our most generous non-suite room: a king plus a second bed, a seating corner out of the walkway, and enough floor left over for a cot. Cots and bed rails are free on request.",
      "Children under 12 eat free from the children's menu at Solomon's when accompanied by an adult, and the pool has a shallow section with a lifeguard on duty at weekends.",
    ],
    sizeSqm: 34,
    bed: "Queen",
    maxAdults: 2,
    maxChildren: 3,
    view: "Garden",
    bathroom: "En-suite with bathtub and shower",
    amenities: [
      "Sprung mattresses",
      "King plus second bed",
      "Free cot & bed rails on request",
      "Children eat free (under 12)",
      "50\" smart TV with DStv",
      "Bathtub & shower",
      "Blackout curtains",
      "Board games & kids' welcome pack",
      "24-hour power",
    ],
    images: [
      { src: img("1540555700478-4be289fbecef"), alt: "Family Spring Room with a king bed and a second bed" },
      { src: img("1618221195710-dd6b41faaea6"), alt: "Seating corner in the Family Spring Room" },
    ],
    rate: 25000,
    accessible: true,
    inventory: 8,
    featured: true,
    cancellation: "Free cancellation until 48 hours before arrival.",
  },
  {
    slug: "double-spring-room",
    name: "Double Spring Room",
    category: "Deluxe",
    tagline: "Sprung mattresses, softer nights",
    description:
      "A double room on our sprung mattresses with a lounge chair, larger desk and a bathtub — a step up in comfort without a step up into the suites.",
    longDescription: [
      "The Double Spring Room adds about a third more floor space than a standard, and it shows most in the corner: an armchair, a side lamp and a reading nook that makes the room feel like somewhere you'd stay on purpose rather than out of necessity.",
      "Bathrooms on this tier have a full tub as well as a separate shower, a heated towel rail and a lit vanity mirror. Turndown service runs from 7pm on request.",
    ],
    sizeSqm: 32,
    bed: "Double",
    maxAdults: 2,
    maxChildren: 2,
    view: "Street or garden",
    bathroom: "En-suite with bathtub, separate rain shower and lit vanity",
    amenities: [
      "Sprung mattress",
      "Free fibre Wi-Fi",
      "Split-unit air conditioning",
      "50\" smart TV with DStv",
      "Bathtub & rain shower",
      "Lounge armchair",
      "Kettle & tea tray",
      "Electronic safe",
      "Mini bar",
      "Turndown service",
      "24-hour power",
    ],
    images: [
      { src: img("1618773928121-c32242e63f39"), alt: "Double Spring Room with a reading nook and floor lamp" },
      { src: img("1520250497591-112f2f40a3f4"), alt: "Bathroom with a freestanding tub" },
    ],
    rate: 30000,
    accessible: false,
    inventory: 10,
    featured: false,
    cancellation: "Free cancellation until 24 hours before arrival.",
  },
  {
    slug: "double-king-room",
    name: "Double King Room",
    category: "Deluxe",
    tagline: "More room to spread out",
    description:
      "A generous king room with a lounge chair, larger desk and a bathtub — our most-booked room, and the one most guests come back for.",
    longDescription: [
      "The Double King is the room guests name when they call back. A full king bed, an armchair by the window, and a desk long enough to work at properly rather than perch at.",
      "Bathrooms on this tier have a full tub as well as a separate shower, a heated towel rail and a lit vanity mirror. Turndown service runs from 7pm on request.",
    ],
    sizeSqm: 34,
    bed: "King",
    maxAdults: 2,
    maxChildren: 2,
    view: "Street or garden",
    bathroom: "En-suite with bathtub, separate rain shower and lit vanity",
    amenities: [
      "Free fibre Wi-Fi",
      "Split-unit air conditioning",
      "50\" smart TV with DStv",
      "Bathtub & rain shower",
      "Lounge armchair",
      "Kettle & tea tray",
      "Electronic safe",
      "Mini bar",
      "Turndown service",
      "24-hour room service",
      "24-hour power",
    ],
    images: [
      { src: img("1611892440504-42a792e24d32"), alt: "Double King room with a king bed and an upholstered armchair" },
      { src: img("1618773928121-c32242e63f39"), alt: "Reading nook and floor lamp in the Double King room" },
      { src: img("1520250497591-112f2f40a3f4"), alt: "Bathroom with a freestanding tub" },
    ],
    rate: 30000,
    accessible: true,
    inventory: 18,
    featured: true,
    cancellation: "Free cancellation until 24 hours before arrival.",
  },
  {
    slug: "executive-suite",
    name: "Executive Suite",
    category: "Executive",
    tagline: "A suite that works as hard as you do",
    description:
      "A quiet upper-floor suite with a separate sitting room, a proper desk setup, complimentary laundry and daily breakfast for two.",
    longDescription: [
      "Executive suites occupy the two top floors, away from the road, with the largest windows in the building. The desk is a full 140cm with a task lamp, monitor-height stand and a dedicated 100 Mbps line — we built this tier for the consultants and contractors who spend a week with us at a time.",
      "The rate includes breakfast for two in Solomon's, one complimentary laundry bag per stay, and guaranteed late checkout at 2pm when the house allows.",
    ],
    sizeSqm: 45,
    bed: "King",
    maxAdults: 2,
    maxChildren: 2,
    view: "City view, upper floor",
    bathroom: "En-suite with double vanity, bathtub and rain shower",
    amenities: [
      "Separate sitting room",
      "Dedicated 100 Mbps line",
      "Executive work desk & task lighting",
      "Breakfast for two included",
      "Complimentary laundry (one bag)",
      "55\" smart TV with DStv",
      "Nespresso machine",
      "Guaranteed 2pm checkout",
      "Bathrobe & slippers",
      "24-hour room service",
    ],
    images: [
      { src: img("1631049307264-da0ec9d70304"), alt: "Executive Suite with a large window and city view" },
      { src: img("1560448204-e02f11c3d0e2"), alt: "Executive Suite sitting room" },
      { src: img("1522708323590-d24dbb6b0267"), alt: "Executive Suite desk with task lighting" },
    ],
    rate: 50000,
    accessible: true,
    inventory: 6,
    featured: true,
    cancellation: "Free cancellation until 48 hours before arrival.",
  },
  {
    slug: "executive-spring-suite",
    name: "Executive Spring Suite",
    category: "Suite",
    tagline: "Our signature address",
    description:
      "A separate living room, dining table for four, kitchenette and a king bedroom on sprung mattresses — the suite we put visiting dignitaries and long-stay families in.",
    longDescription: [
      "The Executive Spring Suite is two rooms and a hallway: a living room with a four-seat sofa and dining table, and a bedroom you can close the door on. It is the room to book when you need to host people without hosting them in a bedroom.",
      "The kitchenette has a microwave, two-plate hob, full-size fridge and proper crockery. Housekeeping services the suite twice daily, and airport pickup is included on arrival.",
    ],
    sizeSqm: 55,
    bed: "King",
    maxAdults: 3,
    maxChildren: 2,
    view: "Corner, dual aspect",
    bathroom: "Master en-suite with soaking tub, plus a guest WC",
    amenities: [
      "Separate living & dining room",
      "Sprung mattresses",
      "Kitchenette with hob and full fridge",
      "Guest WC",
      "Complimentary airport pickup",
      "Breakfast for two included",
      "Twice-daily housekeeping",
      "65\" smart TV & second TV in bedroom",
      "Bathrobe & slippers",
      "Butler service on request",
    ],
    images: [
      { src: img("1578683010236-d716f9a3f461"), alt: "Executive Spring Suite living room with sofa and dining table" },
      { src: img("1560185007-cde436f6a4d0"), alt: "Executive Spring Suite bedroom with a king bed" },
      { src: img("1596394516093-501ba68a0ba6"), alt: "Executive Spring Suite dining area and kitchenette" },
    ],
    rate: 50000,
    accessible: true,
    inventory: 4,
    featured: true,
    cancellation: "Free cancellation until 72 hours before arrival.",
  },
];

export function getRoom(slug: string): Room | undefined {
  return rooms.find((room) => room.slug === slug);
}

export const featuredRooms = rooms.filter((room) => room.featured);

/** Every amenity across the inventory, de-duplicated, for the filter panel. */
export const allAmenities = Array.from(
  new Set(rooms.flatMap((room) => room.amenities)),
).sort();

export const roomCategories: RoomCategory[] = [
  "Standard",
  "Deluxe",
  "Executive",
  "Suite",
  "Family",
];

/* ------------------------------------------------------------- facilities */

export interface Facility {
  name: string;
  description: string;
  /** lucide-react icon name, mapped in the UI. */
  icon: string;
  hours?: string;
}

export interface FacilityGroup {
  category: string;
  blurb: string;
  items: Facility[];
}

export const facilityGroups: FacilityGroup[] = [
  {
    category: "Recreation",
    blurb: "Somewhere to put the day down.",
    items: [
      { name: "Outdoor swimming pool", description: "A 15m pool with a shallow children's section, loungers and shaded cabanas.", icon: "waves", hours: "6:00 – 21:00 daily" },
      { name: "Fitness centre", description: "Cardio machines, free weights to 40kg, and a stretch area. Towels and water provided.", icon: "dumbbell", hours: "24 hours, key-card access" },
      { name: "Spa & massage", description: "Swedish, deep tissue and hot stone treatments in two private rooms. Book at reception.", icon: "flower", hours: "10:00 – 20:00 daily" },
      { name: "Sauna & steam", description: "Dry sauna and steam room adjoining the fitness centre.", icon: "thermometer", hours: "7:00 – 21:00 daily" },
      { name: "Games lounge", description: "Pool table, darts and a large screen for match days.", icon: "gamepad-2", hours: "12:00 – 23:00 daily" },
      { name: "Children's play area", description: "A safe, shaded outdoor play area beside the garden.", icon: "baby", hours: "8:00 – 19:00 daily" },
    ],
  },
  {
    category: "Business",
    blurb: "Built for people who came here to work.",
    items: [
      { name: "Business centre", description: "Printing, scanning, binding and two private call booths.", icon: "printer", hours: "7:00 – 22:00" },
      { name: "Meeting rooms", description: "Three rooms seating 8, 16 and 30, each with a screen and whiteboard.", icon: "presentation" },
      { name: "Conference hall", description: "The Pentagon Hall seats up to 300 theatre-style with full AV.", icon: "users" },
      { name: "Boardroom", description: "A 12-seat boardroom with video-conference kit and a dedicated line.", icon: "briefcase" },
      { name: "High-speed Wi-Fi", description: "Fibre throughout, 100 Mbps in guest rooms, dedicated event SSIDs.", icon: "wifi", hours: "Always on" },
    ],
  },
  {
    category: "Guest services",
    blurb: "The small things, handled.",
    items: [
      { name: "24-hour reception", description: "Someone is always at the desk. Late arrivals are never a problem.", icon: "concierge-bell", hours: "24 hours" },
      { name: "Airport transfer", description: "Port Harcourt International (PHC) pickup and drop-off in a saloon car or SUV.", icon: "plane" },
      { name: "Room service", description: "The full Solomon's menu in your room, plus a reduced overnight menu.", icon: "utensils", hours: "24 hours" },
      { name: "Laundry & dry cleaning", description: "Same-day service on items collected before 9am.", icon: "shirt", hours: "7:00 – 19:00" },
      { name: "Secure parking", description: "Forty free on-site spaces, CCTV covered, security on the gate around the clock.", icon: "car-front", hours: "24 hours" },
      { name: "Car rental & driver", description: "Self-drive or chauffeur-driven hire arranged through the concierge.", icon: "key-round" },
      { name: "Housekeeping", description: "Daily service, with turndown from 7pm on request.", icon: "sparkles", hours: "8:00 – 20:00" },
      { name: "Currency exchange", description: "Major currencies changed at reception at the day's posted rate.", icon: "banknote", hours: "8:00 – 20:00" },
    ],
  },
  {
    category: "Dining",
    blurb: "Three kitchens, one building.",
    items: [
      { name: "Solomon's Restaurant", description: "All-day dining — Nigerian classics and a continental menu.", icon: "chef-hat", hours: "6:30 – 23:00" },
      { name: "The Fifth Bar", description: "Cocktails, cold beer and small plates on the terrace.", icon: "martini", hours: "16:00 – 01:00" },
      { name: "Terrace Café", description: "Coffee, pastries and a quiet corner to work from.", icon: "coffee", hours: "7:00 – 19:00" },
      { name: "Private dining", description: "A twelve-seat private room with its own service.", icon: "wine" },
    ],
  },
];

/* ----------------------------------------------------------------- dining */

export interface MenuHighlight {
  name: string;
  description: string;
  price: number;
}

export interface DiningVenue {
  slug: string;
  name: string;
  cuisine: string;
  blurb: string;
  description: string;
  hours: string;
  dressCode: string;
  capacity: number;
  image: RoomImage;
  highlights: MenuHighlight[];
}

export const diningVenues: DiningVenue[] = [
  {
    slug: "solomons",
    name: "Solomon's Restaurant",
    cuisine: "Nigerian & Continental",
    blurb: "All-day dining, named for the street outside.",
    description:
      "Our main restaurant serves from 6:30am to 11pm. Breakfast is a hot buffet with an eggs station; lunch and dinner run an à la carte menu that keeps one foot in Rivers State and the other somewhere further afield. The jollof is charcoal-finished, and yes, people come from outside the hotel for it.",
    hours: "Breakfast 6:30 – 10:30 · Lunch 12:00 – 16:00 · Dinner 18:00 – 23:00",
    dressCode: "Smart casual",
    capacity: 90,
    image: { src: img("1414235077428-338989a2e8c0"), alt: "Solomon's Restaurant dining room set for dinner" },
    highlights: [
      { name: "Charcoal jollof rice", description: "Long-grain rice finished over charcoal, with grilled chicken or beef and fried plantain.", price: 9500 },
      { name: "Fresh fish pepper soup", description: "Catfish in a clear peppered broth with scent leaf and uziza.", price: 11000 },
      { name: "Native rice & goat", description: "Palm-oil rice with dried fish, goat meat and vegetables.", price: 12500 },
      { name: "Grilled tilapia", description: "Whole tilapia, chilli and garlic, with a side of your choice.", price: 14000 },
      { name: "Full English breakfast", description: "Eggs any style, sausage, beans, grilled tomato and toast.", price: 7500 },
      { name: "Suya platter", description: "Beef and chicken suya, red onion, tomato and yaji spice.", price: 10500 },
    ],
  },
  {
    slug: "fifth-bar",
    name: "The Fifth Bar",
    cuisine: "Cocktails & small plates",
    blurb: "The fifth side of the Pentagon.",
    description:
      "A terrace bar that gets the evening breeze. The list runs from a properly made Old Fashioned to a chapman that isn't sweet enough to hurt. Small plates until midnight, live highlife on the last Friday of every month.",
    hours: "16:00 – 01:00 daily · Live music last Friday monthly",
    dressCode: "Casual",
    capacity: 60,
    image: { src: img("1514933651103-005eec06c04b"), alt: "The Fifth Bar terrace at dusk with warm lighting" },
    highlights: [
      { name: "Pentagon chapman", description: "Our house chapman — bitters, citrus, cucumber, less sugar than you're used to.", price: 5500 },
      { name: "Smoked old fashioned", description: "Bourbon, demerara, bitters, smoked at the table.", price: 8500 },
      { name: "Peppered snail", description: "Sautéed snail in a scotch bonnet sauce.", price: 9000 },
      { name: "Asun", description: "Smoked goat meat, peppers and onion.", price: 8500 },
      { name: "Small chops platter", description: "Puff puff, spring rolls, samosa and peppered gizzard.", price: 7500 },
    ],
  },
  {
    slug: "terrace-cafe",
    name: "Terrace Café",
    cuisine: "Coffee & pastries",
    blurb: "Where the laptops live.",
    description:
      "A quiet corner off the lobby with real espresso, pastries baked in-house each morning, and the strongest Wi-Fi signal in the building. Power outlets at every table, because we know why you're really here.",
    hours: "7:00 – 19:00 daily",
    dressCode: "Come as you are",
    capacity: 28,
    image: { src: img("1470337458703-46ad1756a187"), alt: "Terrace Café counter with espresso machine and pastries" },
    highlights: [
      { name: "Flat white", description: "Double shot, micro-foam, made properly.", price: 3500 },
      { name: "Chin chin & coffee", description: "House chin chin with any hot drink.", price: 4500 },
      { name: "Meat pie", description: "Baked each morning, still warm at nine.", price: 2500 },
      { name: "Club sandwich", description: "Chicken, bacon, egg and fries.", price: 8500 },
    ],
  },
];

export function getDiningVenue(slug: string) {
  return diningVenues.find((venue) => venue.slug === slug);
}

/* ----------------------------------------------------------------- events */

export interface Venue {
  slug: string;
  name: string;
  blurb: string;
  description: string;
  areaSqm: number;
  dimensions: string;
  capacities: { layout: string; seats: number }[];
  equipment: string[];
  image: RoomImage;
  fromRate: number;
}

export const venues: Venue[] = [
  {
    slug: "pentagon-hall",
    name: "The Pentagon Hall",
    blurb: "Our largest space — conferences, weddings, AGMs.",
    description:
      "A column-free hall with a 4.2m ceiling, its own entrance and lobby, so your event never has to queue behind hotel check-in. Blackout capable, fully air conditioned, with a dedicated generator circuit.",
    areaSqm: 380,
    dimensions: "24m × 16m × 4.2m high",
    capacities: [
      { layout: "Theatre", seats: 300 },
      { layout: "Banquet", seats: 220 },
      { layout: "Classroom", seats: 160 },
      { layout: "Cabaret", seats: 180 },
      { layout: "U-shape", seats: 70 },
    ],
    equipment: [
      "6m × 3.5m LED wall",
      "Line-array sound system",
      "Eight wireless microphones",
      "Stage lighting rig",
      "Modular staging",
      "Dedicated event Wi-Fi SSID",
      "Green room",
      "Registration desk & cloakroom",
    ],
    image: { src: img("1505373877841-8d25f7d46678"), alt: "The Pentagon Hall set theatre-style for a conference" },
    fromRate: 850000,
  },
  {
    slug: "choba-room",
    name: "The Choba Room",
    blurb: "Mid-size meetings, training and workshops.",
    description:
      "A bright, flexible room with garden-facing windows that actually open. Ideal for two-day training, board offsites and product days.",
    areaSqm: 120,
    dimensions: "15m × 8m × 3.2m high",
    capacities: [
      { layout: "Theatre", seats: 90 },
      { layout: "Banquet", seats: 60 },
      { layout: "Classroom", seats: 48 },
      { layout: "U-shape", seats: 34 },
      { layout: "Boardroom", seats: 26 },
    ],
    equipment: [
      "98\" 4K display",
      "Ceiling projector & 3m screen",
      "Video-conference camera & mics",
      "Whiteboards & flipcharts",
      "Delegate power at every seat",
      "Natural daylight & blackout blinds",
    ],
    image: { src: img("1540575467063-178a50c2df87"), alt: "The Choba Room arranged classroom-style with daylight" },
    fromRate: 320000,
  },
  {
    slug: "the-boardroom",
    name: "The Boardroom",
    blurb: "Twelve seats, one long table, no distractions.",
    description:
      "A properly soundproofed executive boardroom with a dedicated fibre line, ceiling mics and a service button that summons coffee without interrupting the meeting.",
    areaSqm: 46,
    dimensions: "9m × 5m × 3.2m high",
    capacities: [
      { layout: "Boardroom", seats: 12 },
      { layout: "U-shape", seats: 14 },
      { layout: "Theatre", seats: 24 },
    ],
    equipment: [
      "75\" display with wireless casting",
      "Ceiling array microphones",
      "Dedicated 100 Mbps line",
      "Discreet service call button",
      "Bottled water & notepads included",
    ],
    image: { src: img("1517048676732-d65bc937f952"), alt: "Executive boardroom with a long table and display screen" },
    fromRate: 180000,
  },
  {
    slug: "garden-terrace",
    name: "The Garden Terrace",
    blurb: "Outdoor receptions, weddings and cocktails.",
    description:
      "A walled garden with festoon lighting and a covered pavilion, for receptions that want the evening air. Marquee-ready in the rainy season.",
    areaSqm: 300,
    dimensions: "Open air, 300m² usable",
    capacities: [
      { layout: "Standing reception", seats: 250 },
      { layout: "Banquet", seats: 140 },
      { layout: "Ceremony", seats: 180 },
    ],
    equipment: [
      "Festoon & uplighting",
      "Covered pavilion & bar",
      "Marquee available on request",
      "Generator-backed power drops",
      "Dance floor",
    ],
    image: { src: img("1519671482749-fd09be7ccebf"), alt: "Garden terrace set for an evening wedding reception" },
    fromRate: 650000,
  },
];

export function getVenue(slug: string) {
  return venues.find((venue) => venue.slug === slug);
}

export const eventTypes = [
  "Conference",
  "Wedding",
  "Corporate meeting",
  "Training / workshop",
  "Product launch",
  "Birthday / private party",
  "AGM",
  "Other",
];

/* ----------------------------------------------------------------- offers */

export interface Offer {
  slug: string;
  title: string;
  blurb: string;
  description: string;
  validity: string;
  inclusions: string[];
  terms: string;
  discountLabel: string;
  fromRate: number;
  image: RoomImage;
  code: string;
}

export const offers: Offer[] = [
  {
    slug: "weekend-escape",
    title: "Weekend Escape",
    blurb: "Two nights, late checkout, breakfast for two.",
    description:
      "Arrive Friday or Saturday and stay two nights in a Double King Room with breakfast for two each morning, a 4pm checkout on departure, and a welcome cocktail at The Fifth Bar.",
    validity: "Friday and Saturday arrivals, all year",
    inclusions: [
      "Two nights in a Double King Room",
      "Breakfast for two, both mornings",
      "Welcome cocktail at The Fifth Bar",
      "Guaranteed 4pm checkout",
      "Free parking",
    ],
    terms: "Subject to availability. Two-night minimum. Not combinable with other offers.",
    discountLabel: "Save 15%",
    fromRate: 51000,
    image: { src: img("1551882547-ff40c63fe5fa"), alt: "Poolside loungers under shade on a bright weekend" },
    code: "WEEKEND15",
  },
  {
    slug: "business-week",
    title: "Business Week",
    blurb: "Five nights, laundry, breakfast and airport pickup.",
    description:
      "Built for the Monday-to-Friday guest: an Executive Suite for five nights, breakfast daily, a laundry bag every other day, airport pickup on arrival and guaranteed 2pm checkout on Friday.",
    validity: "Sunday–Monday arrivals, all year",
    inclusions: [
      "Five nights in an Executive Suite",
      "Daily breakfast",
      "Laundry every other day",
      "Airport pickup on arrival",
      "Dedicated 100 Mbps line",
      "Guaranteed 2pm checkout",
    ],
    terms: "Five consecutive nights required. Corporate invoicing available on request.",
    discountLabel: "Save 20%",
    fromRate: 200000,
    image: { src: img("1497366216548-37526070297c"), alt: "A quiet workspace with a laptop and coffee" },
    code: "BIZWEEK20",
  },
  {
    slug: "honeymoon",
    title: "Honeymoon Suite Package",
    blurb: "Two nights in the Executive Spring Suite, dinner included.",
    description:
      "The Executive Spring Suite for two nights, a private three-course dinner served on your terrace, a spa treatment each, and a late breakfast whenever you surface.",
    validity: "All year, seven days' notice",
    inclusions: [
      "Two nights in the Executive Spring Suite",
      "Private three-course dinner for two",
      "One 60-minute spa treatment each",
      "Champagne and fruit on arrival",
      "Room decorated on request",
      "Airport pickup and drop-off",
    ],
    terms: "Seven days' notice required. Marriage certificate not required — we take your word for it.",
    discountLabel: "Save 18%",
    fromRate: 82000,
    image: { src: img("1522673607200-164d1b6ce486"), alt: "A suite prepared with flowers and candles" },
    code: "HONEY18",
  },
  {
    slug: "family-getaway",
    title: "Family Getaway",
    blurb: "Kids stay and eat free.",
    description:
      "The Family Spring Room with two children under 12 staying and eating free from the children's menu, plus a pool day pack and unlimited use of the games lounge.",
    validity: "School holidays and weekends",
    inclusions: [
      "Family Spring Room (sleeps 2 adults + 3 children)",
      "Children under 12 eat free",
      "Pool day pack",
      "Games lounge access",
      "Free cot and bed rails",
      "Late checkout at 2pm",
    ],
    terms: "Maximum two children free per booking. Children must be accompanied by an adult.",
    discountLabel: "Kids free",
    fromRate: 25000,
    image: { src: img("1519823551278-64ac92734fb1"), alt: "Family enjoying the hotel pool" },
    code: "FAMILY",
  },
  {
    slug: "long-stay",
    title: "Long Stay Rate",
    blurb: "Fourteen nights or more, up to 30% off.",
    description:
      "For contractors, relocations and anyone whose project ran long. Fourteen nights or more in any room type at up to 30% off, with weekly deep-clean, laundry and a dedicated invoice line.",
    validity: "All year, 14-night minimum",
    inclusions: [
      "Up to 30% off any room type",
      "Weekly deep clean",
      "Weekly laundry allowance",
      "Monthly corporate invoicing",
      "Free parking",
      "Priority room-type retention",
    ],
    terms: "Fourteen consecutive nights minimum. Rate confirmed by the reservations team.",
    discountLabel: "Up to 30% off",
    fromRate: 14000,
    image: { src: img("1560448204-e02f11c3d0e2"), alt: "A long-stay room with personal belongings settled in" },
    code: "STAY14",
  },
  {
    slug: "early-bird",
    title: "Early Booking",
    blurb: "Book 30 days ahead, save 12%.",
    description:
      "Confirm any room at least thirty days before arrival and take 12% off the direct rate. Fully flexible until 72 hours before you arrive.",
    validity: "Bookings made 30+ days in advance",
    inclusions: [
      "12% off any room type",
      "Free cancellation until 72 hours before arrival",
      "Best-rate guarantee",
      "Free parking",
    ],
    terms: "Applies to direct bookings only. Rate confirmed at time of booking.",
    discountLabel: "Save 12%",
    fromRate: 17600,
    image: { src: img("1524492412937-b28074a5d7da"), alt: "Travel planning with a calendar and passport" },
    code: "EARLY12",
  },
];

export function getOffer(slug: string) {
  return offers.find((offer) => offer.slug === slug);
}

/** Promo codes the booking flow accepts, and what they take off the room total. */
export const promoCodes: Record<string, { discount: number; label: string }> = {
  WEEKEND15: { discount: 0.15, label: "Weekend Escape — 15% off" },
  BIZWEEK20: { discount: 0.2, label: "Business Week — 20% off" },
  HONEY18: { discount: 0.18, label: "Honeymoon package — 18% off" },
  STAY14: { discount: 0.3, label: "Long stay — 30% off" },
  EARLY12: { discount: 0.12, label: "Early booking — 12% off" },
  FAMILY: { discount: 0.1, label: "Family Getaway — 10% off" },
};

/* -------------------------------------------------------------- extras */

export interface ExtraService {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Charged once per booking, or per night of the stay. */
  unit: "stay" | "night";
  icon: string;
}

export const extraServices: ExtraService[] = [
  { id: "airport-pickup", name: "Airport pickup", description: "Met at arrivals at Port Harcourt International and driven to the hotel.", price: 25000, unit: "stay", icon: "plane" },
  { id: "airport-dropoff", name: "Airport drop-off", description: "Driven to the airport at a time you choose.", price: 25000, unit: "stay", icon: "plane-takeoff" },
  { id: "breakfast", name: "Breakfast for two", description: "Full hot breakfast at Solomon's each morning of your stay.", price: 9000, unit: "night", icon: "egg-fried" },
  { id: "late-checkout", name: "Guaranteed late checkout", description: "Keep the room until 4pm on departure day, guaranteed in advance.", price: 15000, unit: "stay", icon: "clock" },
  { id: "spa", name: "60-minute spa treatment", description: "One Swedish or deep-tissue massage per person booked.", price: 22000, unit: "stay", icon: "flower" },
  { id: "laundry", name: "Laundry bundle", description: "One laundry bag per day, returned same day if collected before 9am.", price: 8000, unit: "night", icon: "shirt" },
  { id: "celebration", name: "Celebration set-up", description: "Room decorated with flowers, a cake and a handwritten card.", price: 35000, unit: "stay", icon: "cake" },
];

/* ---------------------------------------------------------------- reviews */

export interface Review {
  author: string;
  rating: number;
  date: string;
  source: string;
  title: string;
  body: string;
  stayType: string;
}

export const reviews: Review[] = [
  {
    author: "Chidinma O.",
    rating: 5,
    date: "2026-06-18",
    source: "Google",
    title: "The generator never blinked",
    body: "Three nights, three power cuts on the street, and I did not notice one of them. The Wi-Fi held up for two client calls a day. Breakfast is genuinely good — ask for the eggs done at the station.",
    stayType: "Business trip · Executive Suite",
  },
  {
    author: "Ibrahim A.",
    rating: 5,
    date: "2026-05-02",
    source: "Booking.com",
    title: "Best value in Choba, no contest",
    body: "Booked the Double King Room on a whim because the university guest house was full. Ended up extending twice. Staff know your name by day two, which sounds small until you've stayed somewhere that doesn't.",
    stayType: "Solo traveller · Double King Room",
  },
  {
    author: "The Adeleke family",
    rating: 5,
    date: "2026-04-11",
    source: "Google",
    title: "Two kids, one suite, zero complaints",
    body: "The Family Spring Room fit all four of us without anyone climbing over a bed, which is the only feature that mattered to us. Pool has a shallow end with a lifeguard at weekends. Kids ate free and ate a lot.",
    stayType: "Family holiday · Family Spring Room",
  },
  {
    author: "Ngozi E.",
    rating: 4,
    date: "2026-03-27",
    source: "TripAdvisor",
    title: "Lovely wedding venue",
    body: "We had 160 guests on the Garden Terrace. The events team ran the timeline better than our own planner did. Only note — the marquee took a while to go up, so build in more time in the rainy season.",
    stayType: "Wedding · Garden Terrace",
  },
  {
    author: "David M.",
    rating: 5,
    date: "2026-02-14",
    source: "Google",
    title: "Conference ran without a hitch",
    body: "Two hundred delegates in the Pentagon Hall. Separate entrance meant we never mixed with hotel check-in. AV team were on it before we asked. Lunch service for 200 came out in under twenty minutes.",
    stayType: "Conference · Pentagon Hall",
  },
  {
    author: "Amaka U.",
    rating: 5,
    date: "2026-01-22",
    source: "Booking.com",
    title: "The jollof is not a marketing claim",
    body: "Stayed two nights, ate at Solomon's four times. The charcoal finish is real. Room was quiet, bed was firm, shower was hot at 5:30am which is all I ask of a hotel.",
    stayType: "Leisure · Standard Queen Room",
  },
];

export const ratingSummary = {
  value:
    Math.round(
      (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 10,
    ) / 10,
  count: reviews.length,
  best: 5,
};

/* ------------------------------------------------------------- attractions */

export interface Attraction {
  name: string;
  category: string;
  distanceKm: number;
  minutes: number;
  note: string;
}

export const attractions: Attraction[] = [
  { name: "University of Port Harcourt (UNIPORT)", category: "Education", distanceKm: 1.2, minutes: 5, note: "Choba campus main gate — a five-minute drive or a short walk from our door." },
  { name: "Port Harcourt International Airport (PHC)", category: "Transport", distanceKm: 22, minutes: 35, note: "Omagwa. We run transfers in a saloon car or SUV; book at least three hours ahead." },
  { name: "Choba Market", category: "Shopping", distanceKm: 1.8, minutes: 7, note: "Fresh produce, fabric and the best pepper in Rivers State. Busiest on Saturday mornings." },
  { name: "Port Harcourt city centre", category: "City", distanceKm: 14, minutes: 30, note: "Banks, corporate offices and the GRA restaurant strip." },
  { name: "Port Harcourt Pleasure Park", category: "Leisure", distanceKm: 15, minutes: 32, note: "Green space, rides and weekend events — a good afternoon with children." },
  { name: "Isaac Boro Park", category: "Leisure", distanceKm: 16, minutes: 35, note: "The city's central park, and the site of most public events." },
  { name: "Rivers State Secretariat", category: "Government", distanceKm: 13, minutes: 28, note: "State government offices in the GRA." },
  { name: "Onne Port", category: "Business", distanceKm: 42, minutes: 70, note: "Oil and gas free zone — a common destination for our corporate guests." },
  { name: "Bonny Island jetty", category: "Transport", distanceKm: 18, minutes: 40, note: "For onward travel to Bonny; the concierge can arrange the boat." },
];

/* ---------------------------------------------------------------- services */

export interface ServiceItem {
  name: string;
  description: string;
  icon: string;
  availability: string;
}

export const guestServices: ServiceItem[] = [
  { name: "Concierge", description: "Restaurant bookings, tickets, city advice and anything the city can supply.", icon: "concierge-bell", availability: "7:00 – 23:00" },
  { name: "Airport transfers", description: "Saloon car or SUV to and from Port Harcourt International. Flight number tracked.", icon: "plane", availability: "24 hours, 3 hours' notice" },
  { name: "Laundry & dry cleaning", description: "Same-day return on items collected before 9am; pressing within two hours.", icon: "shirt", availability: "7:00 – 19:00" },
  { name: "Room service", description: "Full menu until 23:00, reduced overnight menu after.", icon: "utensils", availability: "24 hours" },
  { name: "Housekeeping", description: "Daily service with optional evening turndown.", icon: "sparkles", availability: "8:00 – 20:00" },
  { name: "Wake-up calls", description: "Set at reception, by phone, or at check-in.", icon: "alarm-clock", availability: "24 hours" },
  { name: "Luggage storage", description: "Secure store for early arrivals and late departures, free for guests.", icon: "luggage", availability: "24 hours" },
  { name: "Secure parking", description: "Forty free on-site spaces under CCTV with a manned gate.", icon: "car-front", availability: "24 hours" },
  { name: "Car rental & chauffeur", description: "Self-drive or with a driver, arranged through the concierge.", icon: "key-round", availability: "24 hours' notice" },
  { name: "Babysitting", description: "Vetted, DBS-equivalent checked sitters via our partner agency.", icon: "baby", availability: "24 hours' notice" },
  { name: "Currency exchange", description: "Major currencies at the posted daily rate.", icon: "banknote", availability: "8:00 – 20:00" },
  { name: "Business services", description: "Printing, scanning, binding, courier and private call booths.", icon: "printer", availability: "7:00 – 22:00" },
  { name: "Medical assistance", description: "On-call doctor and a five-minute drive to the nearest hospital. First-aid trained staff on every shift.", icon: "stethoscope", availability: "24 hours" },
  { name: "Prayer room", description: "A quiet room off the ground floor lobby, available to all guests.", icon: "moon", availability: "24 hours" },
];

/* -------------------------------------------------------------------- faq */

export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  { category: "Reservations", question: "How do I book a room?", answer: "Book directly on this site for our best available rate — it takes under two minutes and no account is required. You can also call 0803 383 3628, message us on WhatsApp, or email reservations@pentagonhotelandsuites.com." },
  { category: "Reservations", question: "Is booking direct cheaper than the travel sites?", answer: "Yes. We hold back a direct-booking rate that we do not release to third-party channels, and direct bookings get free parking and priority on room-type requests." },
  { category: "Reservations", question: "Can I modify my reservation?", answer: "Yes. Use Manage Booking with your reference (it starts PHS-), or call us. Changes made outside your rate's cancellation window are free." },
  { category: "Reservations", question: "What is the cancellation policy?", answer: "Standard and Deluxe rooms cancel free until 24 hours before arrival, Executive rooms until 48 hours, and suites until 72 hours. Inside that window, one night is charged. Package rates carry their own terms, shown before you confirm." },
  { category: "Reservations", question: "Do I need to pay a deposit?", answer: "No deposit is required for standard bookings — you can pay online when you book, or settle at the hotel. Group bookings of five rooms or more, and event bookings, require a 50% deposit to confirm." },
  { category: "Reservations", question: "How do I pay?", answer: "Online on this website through our secure payment provider, or by card, bank transfer or cash at the hotel. Card details are handled by the payment provider and never stored on our servers. Corporate accounts can be invoiced monthly." },
  { category: "Check-in", question: "What time is check-in and checkout?", answer: "Check-in from 14:00, checkout by 12:00. Reception is staffed 24 hours, so a late arrival is never a problem — just let us know roughly when to expect you." },
  { category: "Check-in", question: "Is early check-in available?", answer: "Where the room is ready, yes, at no charge. If you need it guaranteed, book the previous night at half rate. Luggage storage is always free." },
  { category: "Check-in", question: "Can I get a late checkout?", answer: "Until 14:00 free on request, subject to availability. Guaranteed 16:00 checkout can be added to any booking for ₦15,000." },
  { category: "Check-in", question: "What do I need to bring to check in?", answer: "A government-issued photo ID for the lead guest — national ID, driver's licence, voter's card or passport." },
  { category: "Rooms", question: "Are extra beds available?", answer: "Yes. Rollaway beds are ₦12,000 per night and cots are free. Request them when booking so we can allocate a room with the floor space." },
  { category: "Rooms", question: "Are children allowed?", answer: "Very much so. Children under 12 stay free when sharing with adults, and eat free from the children's menu at Solomon's when accompanied by an adult." },
  { category: "Rooms", question: "Are connecting rooms available?", answer: "Yes, on the second and third floors. Request them at the time of booking — we cannot guarantee them on arrival." },
  { category: "Rooms", question: "Do the rooms have air conditioning and hot water?", answer: "Every room has a split-unit air conditioner and 24-hour hot water. Both stay on during a power cut — the hotel runs on generator backup with an automatic changeover." },
  { category: "Rooms", question: "Is smoking permitted?", answer: "All rooms and indoor areas are non-smoking. There are designated smoking areas in the garden and on the bar terrace. A ₦50,000 cleaning charge applies to smoking in a room." },
  { category: "Facilities", question: "Is Wi-Fi free?", answer: "Yes, throughout the hotel with no time limit, no device limit and no login page beyond accepting the terms. Executive rooms get a dedicated 100 Mbps line." },
  { category: "Facilities", question: "Is parking available?", answer: "Forty free on-site spaces, CCTV covered, with security at the gate 24 hours. No booking needed." },
  { category: "Facilities", question: "Is the pool open to guests?", answer: "The pool is open 6:00 to 21:00 and is free for hotel guests. Day passes for non-guests are ₦5,000 and include a towel." },
  { category: "Facilities", question: "Is there a gym?", answer: "Yes, open 24 hours with key-card access, free to guests. Cardio machines, free weights to 40kg and a stretch area." },
  { category: "Location", question: "How far is the airport?", answer: "Port Harcourt International (PHC) at Omagwa is 22km, about 35 minutes outside rush hour and up to an hour during it." },
  { category: "Location", question: "Is airport pickup available?", answer: "Yes — ₦25,000 each way in a saloon car, more for an SUV. Give us your flight number and we track it, so a delayed landing doesn't mean a missed driver." },
  { category: "Location", question: "How close is the University of Port Harcourt?", answer: "The Choba campus main gate is 1.2km — a five-minute drive or a fifteen-minute walk. We are the closest full-service hotel to the campus." },
  { category: "Dining", question: "Is breakfast included?", answer: "Included with Executive rooms and suites. On other rates it is ₦4,500 per person, or add breakfast for two to your booking for ₦9,000 a night." },
  { category: "Dining", question: "Can non-guests eat at the restaurant?", answer: "Yes. Solomon's and The Fifth Bar are open to everybody. Book a table on the Dining page or just walk in — weekends fill up after 8pm." },
  { category: "Dining", question: "Do you cater for dietary requirements?", answer: "Vegetarian, vegan, halal and gluten-free options are on the standing menu, and the kitchen will work around allergies with a day's notice." },
  { category: "Accessibility", question: "Do you have accessible rooms?", answer: "Yes — four step-free rooms with wider doorways, grab rails, roll-in showers and lowered fittings. See our Accessibility page for the full detail, or call us to talk it through." },
  { category: "Events", question: "How do I book an event space?", answer: "Submit a quote request on the Events page and our team responds within one working day with availability, a layout plan and pricing. Or call and speak to someone directly." },
  { category: "Events", question: "Can we bring our own caterer?", answer: "Our kitchen caters most events, but external caterers are permitted for a corkage and kitchen-access fee. Talk to the events team early." },
];

export const faqCategories = Array.from(new Set(faqs.map((faq) => faq.category)));

/* -------------------------------------------------------------- gallery */

export interface GalleryImage {
  src: string;
  alt: string;
  category: string;
  /** Tall images take two grid rows in the masonry layout. */
  tall?: boolean;
}

export const galleryCategories = [
  "All",
  "Hotel",
  "Rooms",
  "Dining",
  "Pool & Spa",
  "Events",
  "Surroundings",
];

export const galleryImages: GalleryImage[] = [
  { src: img("1566073771259-6a8506099945"), alt: "A Standard Queen Room made up for arrival", category: "Rooms" },
  { src: img("1611892440504-42a792e24d32"), alt: "Double King Room with armchair and reading lamp", category: "Rooms", tall: true },
  { src: img("1631049307264-da0ec9d70304"), alt: "Executive Suite with a city view", category: "Rooms" },
  { src: img("1578683010236-d716f9a3f461"), alt: "The living room of the Executive Spring Suite", category: "Rooms" },
  { src: img("1520250497591-112f2f40a3f4"), alt: "Suite bathroom with a freestanding bathtub", category: "Rooms" },
  { src: img("1445019980597-93fa8acb246c"), alt: "The hotel lobby at reception", category: "Hotel", tall: true },
  { src: img("1584132967334-10e028bd69f7"), alt: "The hotel exterior at dusk", category: "Hotel" },
  { src: img("1517840901100-8179e982acb7"), alt: "Lobby seating and the concierge desk", category: "Hotel" },
  { src: img("1414235077428-338989a2e8c0"), alt: "Solomon's Restaurant set for dinner", category: "Dining" },
  { src: img("1514933651103-005eec06c04b"), alt: "The Fifth Bar terrace in the evening", category: "Dining", tall: true },
  { src: img("1551218808-94e220e084d2"), alt: "A plated dish from the Solomon's dinner menu", category: "Dining" },
  { src: img("1470337458703-46ad1756a187"), alt: "Coffee and pastries at the Terrace Café", category: "Dining" },
  { src: img("1519167758481-83f550bb49b3"), alt: "The outdoor pool with loungers", category: "Pool & Spa", tall: true },
  { src: img("1544148103-0773bf10d330"), alt: "A treatment room in the spa", category: "Pool & Spa" },
  { src: img("1534438327276-14e5300c3a48"), alt: "The 24-hour fitness centre", category: "Pool & Spa" },
  { src: img("1505373877841-8d25f7d46678"), alt: "The Pentagon Hall set for a conference", category: "Events" },
  { src: img("1519671482749-fd09be7ccebf"), alt: "The Garden Terrace during an evening reception", category: "Events", tall: true },
  { src: img("1540575467063-178a50c2df87"), alt: "The Choba Room arranged for a workshop", category: "Events" },
  { src: img("1464366400600-7168b8af9bc3"), alt: "Guests at a celebration in the garden", category: "Events" },
  { src: img("1449824913935-59a10b8d2000"), alt: "The road into Choba at golden hour", category: "Surroundings" },
  { src: img("1523905330026-b8bd1f5f320e"), alt: "Port Harcourt city lights after dark", category: "Surroundings", tall: true },
  { src: img("1488646953014-85cb44e25828"), alt: "Local market colour near the hotel", category: "Surroundings" },
];

/* ----------------------------------------------------------------- journal */

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tag: string;
  readMinutes: number;
  image: RoomImage;
  body: string[];
}

export const posts: Post[] = [
  {
    slug: "first-time-in-port-harcourt",
    title: "A first-timer's 48 hours in Port Harcourt",
    excerpt:
      "What to eat, where to go and how long everything actually takes — written by people who drive these roads daily.",
    date: "2026-07-14",
    tag: "City guide",
    readMinutes: 6,
    image: { src: img("1449824913935-59a10b8d2000"), alt: "A Port Harcourt street scene at golden hour" },
    body: [
      "Port Harcourt rewards people who plan around traffic rather than against it. If you are here for two days, treat the morning as your movement window and the afternoon as your sitting-still window. Anything you need to do on the mainland side is easier before 9am.",
      "Start on our side of the water. Choba Market opens early and is at its best before the heat sets in — go for the pepper and the fabric, stay for the noise. It is a seven-minute drive from the hotel, or a twenty-minute walk if you are the walking type and it is not raining.",
      "By late morning, head into the GRA. The restaurant strip there is where the city eats when it wants to be seen eating, and it is worth one meal of your two days. Give yourself thirty minutes each way and do not book anything tight on either side.",
      "Afternoon belongs to the Pleasure Park if you have children with you, or to a long lunch if you do not. Evening, come back to this side. The Fifth Bar catches the breeze from about six, and on the last Friday of the month there is live highlife until late.",
      "Day two: if you have business at Onne, leave by 6:30am. If you do not, spend the morning at the pool and the afternoon at Isaac Boro Park. Fly out from Omagwa allowing a clear ninety minutes from our door — thirty-five on a good day, but the road does not always have good days.",
    ],
  },
  {
    slug: "why-choba-for-conferences",
    title: "Why more conferences are landing in Choba",
    excerpt:
      "The university, the free zone and a hall with its own entrance. What changed in the last three years.",
    date: "2026-06-02",
    tag: "Events",
    readMinutes: 5,
    image: { src: img("1505373877841-8d25f7d46678"), alt: "A conference in progress in the Pentagon Hall" },
    body: [
      "Three years ago, an organiser running a two-hundred-delegate event in Rivers State booked into the GRA by default and moved everybody by bus. That has quietly stopped being the obvious choice.",
      "The first reason is UNIPORT. Academic conferences want to be near the campus, and Choba is the campus. Delegates walk in. Speakers do not lose an hour each way. When the schedule slips — and it always slips — nobody misses their session because of the East-West Road.",
      "The second is Onne. The free zone brings a steady flow of corporate events that need to be reachable from both the port and the airport, and Choba sits between them rather than beyond one of them.",
      "The third is more prosaic: dedicated entrances. The Pentagon Hall has its own door and its own lobby, which means a conference registration desk never queues behind hotel check-in at 2pm. Organisers notice this exactly once — the first time they run an event somewhere that doesn't have it.",
      "None of this makes Choba the right answer for every event. If your delegates are all flying in for a single day, the airport side still wins. But for anything that runs more than a day, or anything with a university in it, the maths has changed.",
    ],
  },
  {
    slug: "the-charcoal-jollof-question",
    title: "The charcoal jollof question, settled",
    excerpt:
      "Our head chef on why the last four minutes over coals matter more than everything before them.",
    date: "2026-04-30",
    tag: "Dining",
    readMinutes: 4,
    image: { src: img("1551218808-94e220e084d2"), alt: "Jollof rice plated with grilled chicken and plantain" },
    body: [
      "There is a moment, near the end of a pot of jollof, where the rice at the bottom starts to catch. Most kitchens treat that as a failure. We treat it as the point.",
      "The base is unremarkable and deliberately so: blended red pepper, tomato, onion, a long reduction until the raw edge goes and the colour deepens to something closer to brick than red. Rice goes in, stock goes in, lid goes on, and then nobody touches it.",
      "The last four minutes happen over charcoal, not gas. The pot sits directly on the coals and the bottom layer takes on a smoke that you cannot fake with liquid smoke, paprika or good intentions. Then the whole pot is turned once, so the smoked layer folds through the rest.",
      "That is the entire trick. It is not a secret, it is just inconvenient — it requires charcoal in a professional kitchen, which most hotels have quietly stopped keeping. We have not, and we do not intend to.",
    ],
  },
  {
    slug: "staying-powered",
    title: "What 'uninterrupted power' actually means here",
    excerpt:
      "Automatic changeover, load calculations and why your air conditioner does not stutter at 3am.",
    date: "2026-03-08",
    tag: "Hotel news",
    readMinutes: 4,
    image: { src: img("1497366216548-37526070297c"), alt: "A desk lamp and laptop lit in a quiet room" },
    body: [
      "Every hotel in this country will tell you it has a generator. Fewer will tell you what happens in the eleven seconds between the grid going down and the generator picking up, which is the only part guests actually experience.",
      "We run an automatic transfer switch with a battery bridge across the changeover. In practice that means lights, air conditioning and Wi-Fi do not drop — there is no flicker, no reboot of your router, no rebooting mid-call.",
      "The generator is sized for full house load, not partial. That distinction matters at 2pm in March when every room is occupied and every air conditioner is running. A generator sized for 60% of load works beautifully in the dry season and fails in exactly the week you need it.",
      "We also run the fibre line on the protected circuit rather than on the general one, which is why the Wi-Fi survives what the street outside does not. It is a small engineering decision that shows up in about a third of our reviews.",
    ],
  },
];

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}
