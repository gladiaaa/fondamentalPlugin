import Link from "next/link";
import CubeIcon from "./cube.svg";
import { cn } from "@/lib/cn";

/**
 * Logo (`.lk`/`.wm` de la maquette) : le cube de `docs/front/charte/logo/`,
 * le nom composé en Sora (jamais en image, brief §7).
 */
export function Logo({
  size = 34,
  withWordmark = true,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", className)}>
      <CubeIcon width={size} height={(size * 110) / 100} aria-hidden="true" />
      {withWordmark && (
        <span className="font-display text-[1.15rem] font-semibold leading-none tracking-[-.045em]">
          Fondamental
          <small className="mt-[.35em] block text-[.64em] font-light leading-none tracking-[-.02em] text-accent-text">
            Plugins
          </small>
        </span>
      )}
    </Link>
  );
}
