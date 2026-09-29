import Link from "next/link";
import type { ProductResponse, ReleaseInfo } from "@fondamental/shared";
import { Badge } from "@/components/ui/Badge";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { getFiles } from "@/lib/api/products";
import { formatDate } from "@/lib/format";

/** Premières lignes utiles d'un changelog Markdown, sans la mise en forme. */
function highlights(changelog: string, max = 3): string[] {
  return changelog
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*] /.test(line))
    .map((line) =>
      line
        .replace(/^[-*] /, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\s*:\s.*$/, ""),
    )
    .slice(0, max);
}

/** Dernière version publiée de chaque plugin (données réelles des fichiers publiés). */
export async function LatestReleases({ products }: { products: ProductResponse[] }) {
  const latest = (
    await Promise.all(
      products.map(async (product) => {
        const files = await getFiles(product.slug).catch(() => []);
        const release = files.map((f) => f.release).find((r) => r.channel === "RELEASE") ?? files[0]?.release;
        return release ? { product, release } : null;
      }),
    )
  )
    .filter((entry): entry is { product: ProductResponse; release: ReleaseInfo } => entry !== null)
    .sort((a, b) => b.release.releasedAt.localeCompare(a.release.releasedAt));

  if (latest.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {latest.map(({ product, release }) => {
        const Icon = PLUGIN_ICONS[product.slug];
        const points = highlights(release.changelog);
        return (
          <article key={product.slug} className="grid content-start gap-3 rounded-card-lg border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              {Icon && <Icon width={36} height={36} />}
              <div className="grid min-w-0">
                <h3 className="truncate font-display text-[1.02rem] font-semibold">{product.name}</h3>
                <span className="text-[.82rem] text-muted">{formatDate(release.releasedAt)}</span>
              </div>
              <Badge variant="accent" className="ml-auto">
                v{release.version}
              </Badge>
            </div>
            {/* Notes de version vides (release publiée sans texte) : rien d'inventé, seulement la version. */}
            {points.length > 0 && (
              <ul className="grid gap-1.5 text-[.9rem] text-muted">
                {points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden className="text-accent-text">
                      •
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/plugins/${product.slug}`} className="text-[.88rem] font-medium text-accent-text hover:underline">
              Notes de version et téléchargements
            </Link>
          </article>
        );
      })}
    </div>
  );
}
