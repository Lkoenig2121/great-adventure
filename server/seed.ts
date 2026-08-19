import { hashPassword } from "./auth";
import { query } from "./db";
import type { AttractionKind, AttractionStatus, SiteCode } from "../lib/theme-park";
import { kindAcceptsFlashPass } from "../lib/theme-park";

const DEMO_PASSWORD = "park1979";

type SeedOperator = {
  id: string;
  username: string;
  displayName: string;
  role: "guest_wall" | "ride_ops" | "supervisor" | "flash_pass";
  siteCode: SiteCode | null;
  unitCode: string | null;
};

type SeedAttraction = {
  code: string;
  name: string;
  kind: AttractionKind;
  siteCode: SiteCode;
  unitCode: string;
  assignedUsername: string | null;
  queueCapacity: number;
  staleAfterSeconds: number;
  notes: string;
  status: AttractionStatus;
  waitMinutes: number | null;
  trainsOnTrack: number | null;
};

const OPERATORS: SeedOperator[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    username: "wall",
    displayName: "Liberty Court guest wall",
    role: "guest_wall",
    siteCode: null,
    unitCode: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    username: "westops",
    displayName: "Dana Ruiz — West 1",
    role: "ride_ops",
    siteCode: "best-of-the-west",
    unitCode: null,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    username: "forestops",
    displayName: "Chris Lang — Forest",
    role: "ride_ops",
    siteCode: "enchanted-forest",
    unitCode: null,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    username: "lead",
    displayName: "Pat Okonkwo — Park lead",
    role: "supervisor",
    siteCode: null,
    unitCode: null,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    username: "flash",
    displayName: "Jordan Hale — Gold Flash Pass",
    role: "flash_pass",
    siteCode: null,
    unitCode: null,
  },
];

const ATTRACTIONS: SeedAttraction[] = [
  {
    code: "RT",
    name: "Rolling Thunder",
    kind: "coaster",
    siteCode: "best-of-the-west",
    unitCode: "RT-1",
    assignedUsername: "westops",
    queueCapacity: 1200,
    staleAfterSeconds: 120,
    notes: "Wood coaster. Call West 1 if both sides are not cycling.",
    status: "cycling",
    waitMinutes: 35,
    trainsOnTrack: 2,
  },
  {
    code: "RMT",
    name: "Runaway Mine Train",
    kind: "coaster",
    siteCode: "best-of-the-west",
    unitCode: "RMT-1",
    assignedUsername: "westops",
    queueCapacity: 800,
    staleAfterSeconds: 150,
    notes: "Steel mine ride through Best of the West.",
    status: "open",
    waitMinutes: 15,
    trainsOnTrack: 2,
  },
  {
    code: "FLUME",
    name: "Log Flume",
    kind: "water",
    siteCode: "best-of-the-west",
    unitCode: "FLUME-1",
    assignedUsername: "westops",
    queueCapacity: 600,
    staleAfterSeconds: 180,
    notes: "Two drops. Splash zone staffing required.",
    status: "open",
    waitMinutes: 25,
    trainsOnTrack: 8,
  },
  {
    code: "CAR",
    name: "Carousel",
    kind: "family",
    siteCode: "kiddie-kingdom",
    unitCode: "KK-CAR",
    assignedUsername: "westops",
    queueCapacity: 200,
    staleAfterSeconds: 300,
    notes: "Kiddie Kingdom centerpiece.",
    status: "open",
    waitMinutes: 5,
    trainsOnTrack: null,
  },
  {
    code: "KK",
    name: "Kiddie Kingdom flats",
    kind: "family",
    siteCode: "kiddie-kingdom",
    unitCode: "KK-FLATS",
    assignedUsername: "westops",
    queueCapacity: 180,
    staleAfterSeconds: 300,
    notes: "Cluster of junior rides by the tents.",
    status: "open",
    waitMinutes: 0,
    trainsOnTrack: null,
  },
  {
    code: "ALLEY",
    name: "Goodtime Alley midway",
    kind: "flat",
    siteCode: "goodtime-alley",
    unitCode: "GA-MID",
    assignedUsername: null,
    queueCapacity: 400,
    staleAfterSeconds: 240,
    notes: "Boardwalk games plus spin rides.",
    status: "open",
    waitMinutes: 10,
    trainsOnTrack: null,
  },
  {
    code: "GRAND",
    name: "Grand Theatre",
    kind: "show",
    siteCode: "liberty-court",
    unitCode: "LC-TH",
    assignedUsername: "lead",
    queueCapacity: 900,
    staleAfterSeconds: 600,
    notes: "Next house listed on the event log, not a wait time.",
    status: "open",
    waitMinutes: 0,
    trainsOnTrack: null,
  },
  {
    code: "YDD",
    name: "Yankee Doodle Dandy",
    kind: "dining",
    siteCode: "liberty-court",
    unitCode: "LC-FS",
    assignedUsername: "lead",
    queueCapacity: 120,
    staleAfterSeconds: 420,
    notes: "Entrance plaza food. Guest wall can show wait.",
    status: "open",
    waitMinutes: 8,
    trainsOnTrack: null,
  },
  {
    code: "GR",
    name: "Guest Relations",
    kind: "service",
    siteCode: "liberty-court",
    unitCode: "LC-GR",
    assignedUsername: "lead",
    queueCapacity: 40,
    staleAfterSeconds: 600,
    notes: "Not a ride. Used so leads can see desk load.",
    status: "open",
    waitMinutes: 12,
    trainsOnTrack: null,
  },
  {
    code: "AQUA",
    name: "Aqua Stadium",
    kind: "show",
    siteCode: "neptunes-kingdom",
    unitCode: "NK-AQUA",
    assignedUsername: "lead",
    queueCapacity: 2000,
    staleAfterSeconds: 480,
    notes: "Marine mammal house. Status = in progress / next show.",
    status: "cycling",
    waitMinutes: 0,
    trainsOnTrack: null,
  },
  {
    code: "RR",
    name: "Roaring Rapids",
    kind: "water",
    siteCode: "neptunes-kingdom",
    unitCode: "NK-RR",
    assignedUsername: "lead",
    queueCapacity: 700,
    staleAfterSeconds: 150,
    notes: "Rafts. Weather hold when lightning is in the county.",
    status: "weather_hold",
    waitMinutes: 40,
    trainsOnTrack: 6,
  },
  {
    code: "BW",
    name: "Big Wheel",
    kind: "flat",
    siteCode: "enchanted-forest",
    unitCode: "EF-BW",
    assignedUsername: "forestops",
    queueCapacity: 500,
    staleAfterSeconds: 180,
    notes: "Ferris wheel. Wind restrictions above 35 mph.",
    status: "open",
    waitMinutes: 20,
    trainsOnTrack: null,
  },
  {
    code: "LL",
    name: "Lightnin' Loops",
    kind: "coaster",
    siteCode: "enchanted-forest",
    unitCode: "EF-LL",
    assignedUsername: "forestops",
    queueCapacity: 900,
    staleAfterSeconds: 90,
    notes: "Interlocking loops. Dual-side dispatch. Stale fast — ops must check in.",
    status: "down",
    waitMinutes: 0,
    trainsOnTrack: 0,
  },
  {
    code: "SB",
    name: "Swiss Bob",
    kind: "flat",
    siteCode: "enchanted-forest",
    unitCode: "EF-SB",
    assignedUsername: "forestops",
    queueCapacity: 360,
    staleAfterSeconds: 180,
    notes: "Bobsled spinner.",
    status: "delayed",
    waitMinutes: 30,
    trainsOnTrack: null,
  },
  {
    code: "ENT",
    name: "Enterprise",
    kind: "flat",
    siteCode: "enchanted-forest",
    unitCode: "EF-ENT",
    assignedUsername: "forestops",
    queueCapacity: 320,
    staleAfterSeconds: 180,
    notes: "Gondola wheel.",
    status: "open",
    waitMinutes: 18,
    trainsOnTrack: null,
  },
  {
    code: "SKY",
    name: "Sky Ride",
    kind: "transport",
    siteCode: "enchanted-forest",
    unitCode: "SKY-1",
    assignedUsername: "forestops",
    queueCapacity: 250,
    staleAfterSeconds: 210,
    notes: "Cable cars linking forest and west. Both stations must be staffed.",
    status: "open",
    waitMinutes: 5,
    trainsOnTrack: null,
  },
  {
    code: "PG",
    name: "Pioneer Grill",
    kind: "dining",
    siteCode: "best-of-the-west",
    unitCode: "WEST-FS",
    assignedUsername: "westops",
    queueCapacity: 90,
    staleAfterSeconds: 420,
    notes: "Western plaza dining.",
    status: "open",
    waitMinutes: 6,
    trainsOnTrack: null,
  },
];

export async function seedIfEmpty() {
  const existing = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM operators`);
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const operator of OPERATORS) {
    await query(
      `INSERT INTO operators (id, username, display_name, password_hash, role, site_code, unit_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        operator.id,
        operator.username,
        operator.displayName,
        passwordHash,
        operator.role,
        operator.siteCode,
        operator.unitCode,
      ],
    );
  }

  const operatorsByUsername = new Map(OPERATORS.map((op) => [op.username, op]));

  for (const attraction of ATTRACTIONS) {
    const id = crypto.randomUUID();
    const assigned = attraction.assignedUsername
      ? operatorsByUsername.get(attraction.assignedUsername)
      : null;
    await query(
      `INSERT INTO attractions (
        id, code, name, kind, site_code, unit_code, assigned_operator_id,
        queue_capacity, stale_after_seconds, internal_notes, flash_pass_eligible
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        attraction.code,
        attraction.name,
        attraction.kind,
        attraction.siteCode,
        attraction.unitCode,
        assigned?.id ?? null,
        attraction.queueCapacity,
        attraction.staleAfterSeconds,
        attraction.notes,
        kindAcceptsFlashPass(attraction.kind),
      ],
    );
    const snapId = crypto.randomUUID();
    const reporter = assigned?.id ?? OPERATORS[3].id;
    await query(
      `INSERT INTO status_snapshots (
        id, attraction_id, status, wait_minutes, trains_on_track, hold_reason, reported_by_id, is_current
      ) VALUES ($1,$2,$3,$4,$5,$6,$7, TRUE)`,
      [
        snapId,
        id,
        attraction.status,
        attraction.waitMinutes,
        attraction.trainsOnTrack,
        attraction.status === "weather_hold" ? "Lightning within 10 miles" : null,
        reporter,
      ],
    );
    await query(
      `INSERT INTO events (id, attraction_id, type, message, payload, actor_id)
       VALUES ($1,$2,'status_change',$3,$4::jsonb,$5)`,
      [
        crypto.randomUUID(),
        id,
        `${attraction.name} opened the day as ${attraction.status.replace("_", " ")}`,
        JSON.stringify({ nextStatus: attraction.status }),
        reporter,
      ],
    );
  }
}

export async function ensureFlashPassHolder() {
  const existing = await query<{ id: string }>(
    `SELECT id FROM operators WHERE username = 'flash'`,
  );
  if (existing.rows[0]) return;
  await query(
    `INSERT INTO operators (id, username, display_name, password_hash, role, site_code, unit_code)
     VALUES ($1, 'flash', $2, $3, 'flash_pass', NULL, NULL)`,
    [
      "55555555-5555-4555-8555-555555555555",
      "Jordan Hale — Gold Flash Pass",
      await hashPassword(DEMO_PASSWORD),
    ],
  );
}
