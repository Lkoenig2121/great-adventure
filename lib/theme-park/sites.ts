import type { SiteCode } from "./types";

export type Site = {
  code: SiteCode;
  name: string;
  region: string;
  radio: string;
};

export const SITES: Site[] = [
  {
    code: "liberty-court",
    name: "Liberty Court",
    region: "Entrance / south plaza",
    radio: "Base",
  },
  {
    code: "best-of-the-west",
    name: "Best of the West",
    region: "Southwest",
    radio: "West 1",
  },
  {
    code: "kiddie-kingdom",
    name: "Kiddie Kingdom",
    region: "South center",
    radio: "West 2",
  },
  {
    code: "goodtime-alley",
    name: "Goodtime Alley",
    region: "Midway",
    radio: "Midway",
  },
  {
    code: "neptunes-kingdom",
    name: "Neptune's Kingdom",
    region: "North waterfront",
    radio: "Aqua",
  },
  {
    code: "enchanted-forest",
    name: "Enchanted Forest",
    region: "Northeast",
    radio: "Forest",
  },
];

export function siteByCode(code: string): Site | undefined {
  return SITES.find((site) => site.code === code);
}

export function isSiteCode(value: string): value is SiteCode {
  return SITES.some((site) => site.code === value);
}
