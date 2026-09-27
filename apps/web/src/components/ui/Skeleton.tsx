import { cn } from "@/lib/cn";

/** Bloc de chargement animé (`.sk` de la maquette). Donne une largeur/hauteur via `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-shimmer rounded-[10px] bg-[linear-gradient(90deg,var(--color-surface-2),var(--color-line),var(--color-surface-2))] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
