/** Joint des classes conditionnelles, sans dépendance supplémentaire. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
