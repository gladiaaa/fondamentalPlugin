import { cn } from "@/lib/cn";

/** Indicateur de chargement rond (`.spin` de la maquette). */
export function Spinner({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={cn(
        "block animate-spin rounded-full border-line border-t-accent motion-reduce:animate-none",
        size === "sm" ? "inline-block size-4 border-2" : "size-[46px] border-[3px]",
        className,
      )}
    />
  );
}
