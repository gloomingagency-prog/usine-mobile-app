export const STATUS_LABEL: Record<string, string> = {
  idea: "Idée",
  analyzing: "En analyse",
  killed: "Tuée",
  pivot: "À pivoter",
  viable: "Viable",
  scoping: "Cadrage",
  building: "En build",
  internal_testing: "Test interne",
  store_review: "En review",
  rejected: "Rejetée",
  live: "Live",
  improving: "En amélioration",
  sunset_proposed: "Sunset proposé",
  sunset: "Sunset",
};

export function statusBadgeClass(status: string): string {
  if (["live", "improving"].includes(status)) return "validee";
  if (["killed", "sunset", "sunset_proposed", "rejected"].includes(status)) return "refusee";
  if (["scoping", "building", "internal_testing", "store_review", "viable"].includes(status)) return "decidee";
  return "a_valider";
}
