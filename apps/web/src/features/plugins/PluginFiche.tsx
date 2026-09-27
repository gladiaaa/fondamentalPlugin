"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductResponse, ReleaseFileResponse } from "@fondamental/shared";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Table } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatFileSize, formatPriceCents } from "@/lib/format";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import {
  ServeurIcon,
  EclairIcon,
  RapideIcon,
  TelechargerIcon,
  LienExterneIcon,
  PanierIcon,
  CleIcon,
  SupportIcon,
} from "@/components/icons";

const EDITION_LABEL: Record<ReleaseFileResponse["edition"], string> = {
  UNIVERSAL: "Selon la clé",
  FREE: "Gratuit",
  PREMIUM: "Premium",
};

export interface PluginFicheProps {
  product: ProductResponse;
  versions: string[];
  files: ReleaseFileResponse[];
}

/** Fiche d'un plugin (`/plugins/[slug]`, `#fiche.<slug>` de la maquette). */
export function PluginFiche({ product, versions, files }: PluginFicheProps) {
  // `Icon` est un composant : impossible de le passer en prop depuis le
  // Server Component qui appelle `PluginFiche` (React refuse de sérialiser
  // une fonction à la frontière serveur/client), d'où la résolution ici.
  const Icon = PLUGIN_ICONS[product.slug] ?? PanierIcon;
  const [tab, setTab] = useState("desc");
  const [mcVersion, setMcVersion] = useState("all");

  const visibleFiles = useMemo(
    () => (mcVersion === "all" ? files : files.filter((f) => f.minecraftVersions.includes(mcVersion))),
    [files, mcVersion],
  );

  const latestVersion = files[0]?.release.version;
  const requiredDeps = product.requirements.dependencies.filter((d) => d.required);
  const recommendedDeps = product.requirements.dependencies.filter((d) => !d.required);

  // Un release peut avoir plusieurs fichiers (Gratuit + Premium) : le changelog ne se répète pas.
  const releases = useMemo(() => {
    const seen = new Set<string>();
    return files.filter((f) => {
      if (seen.has(f.release.version)) return false;
      seen.add(f.release.version);
      return true;
    });
  }, [files]);

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[1120px] gap-6">
        <nav aria-label="Fil d'Ariane" className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">
          <Link href="/plugins" className="hover:text-text">
            Plugins
          </Link>{" "}
          / <span className="text-text">{product.name}</span>
        </nav>

        <div className="flex flex-wrap items-start gap-4">
          <Icon width={76} height={76} className="shrink-0" />
          <div className="grid min-w-0 flex-1 gap-2">
            <h1 className="font-display text-[clamp(1.6rem,4vw,2.3rem)] font-semibold tracking-[-.04em]">
              {product.name}
            </h1>
            <p className="max-w-[62ch] text-[1.05rem] text-muted">{product.description}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[.88rem] text-muted">
              <li className="flex items-center gap-1.5">
                <ServeurIcon /> {product.requirements.platform}
              </li>
              <li className="flex items-center gap-1.5">
                <EclairIcon /> Java {product.requirements.java}
              </li>
              {latestVersion && (
                <li className="flex items-center gap-1.5">
                  <RapideIcon /> Version {latestVersion}
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <TelechargerIcon />{" "}
                {product.distribution === "SINGLE_JAR" ? "Un seul fichier" : "Fichiers Gratuit et Premium"}
              </li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="desc">Description</TabsTrigger>
              <TabsTrigger value="dl">Téléchargements</TabsTrigger>
              <TabsTrigger value="log">Changelog</TabsTrigger>
              <Link
                href="/wiki"
                className="-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-[1.1em] py-[.9em] text-[.92rem] font-medium text-muted hover:text-text"
              >
                Wiki <LienExterneIcon width={14} height={14} />
              </Link>
            </TabsList>

            <TabsContent value="desc">
              <h2 className="sr-only">Description</h2>
              <p className="text-[1.02rem]">{product.description}</p>

              <h3 className="mt-2 font-display text-[1.02rem] font-semibold tracking-[-.02em]">Prérequis</h3>
              <dl className="grid gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Serveur</dt>
                  <dd>{product.requirements.platform}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Java</dt>
                  <dd>Java {product.requirements.java} ou plus</dd>
                </div>
                {requiredDeps.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-warning">Obligatoire</dt>
                    <dd>
                      {requiredDeps.map((d) => d.name).join(", ")}
                      <span className="block text-muted">{requiredDeps.map((d) => d.note).join(" · ")}</span>
                    </dd>
                  </div>
                )}
                {recommendedDeps.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Recommandé</dt>
                    <dd>
                      {recommendedDeps.map((d) => d.name).join(", ")}
                      <span className="block text-muted">{recommendedDeps.map((d) => d.note).join(" · ")}</span>
                    </dd>
                  </div>
                )}
              </dl>
            </TabsContent>

            <TabsContent value="dl">
              {versions.length > 0 && (
                <Field label="Version de Minecraft" htmlFor="mc-version" className="max-w-[260px]">
                  <Select id="mc-version" value={mcVersion} onChange={(e) => setMcVersion(e.target.value)}>
                    <option value="all">Toutes les versions</option>
                    {versions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {visibleFiles.length === 0 ? (
                <EmptyState
                  icon={<TelechargerIcon width={26} height={26} />}
                  title="Aucun fichier disponible pour l'instant"
                  description={
                    files.length === 0
                      ? "Aucune version n'a encore été publiée pour ce plugin."
                      : "Aucun fichier compatible avec cette version de Minecraft."
                  }
                />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">Version</th>
                      <th scope="col">Édition</th>
                      <th scope="col">Minecraft</th>
                      <th scope="col">Date</th>
                      <th scope="col">Taille</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFiles.map((file) => (
                      <tr key={file.id}>
                        <td className="font-semibold">{file.release.version}</td>
                        <td>
                          <Badge variant={file.edition === "PREMIUM" ? "accent" : "neutral"}>
                            {EDITION_LABEL[file.edition]}
                          </Badge>
                        </td>
                        <td>{file.minecraftVersions.join(", ")}</td>
                        <td>{formatDate(file.release.releasedAt)}</td>
                        <td>{formatFileSize(file.sizeBytes)}</td>
                        <td className="text-right">
                          {/* Lien direct (docs/api-front.md §4) : jamais un fetch, le navigateur télécharge tout seul. */}
                          <Button size="sm" variant="secondary" asChild>
                            <a href={file.downloadUrl}>
                              <TelechargerIcon width={16} height={16} /> Télécharger
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {product.distribution === "FREE_PREMIUM_JARS" && visibleFiles.length > 0 && (
                <p className="text-[.88rem] text-muted">
                  Un jar Premium sans clé de licence valide fonctionne comme le jar Gratuit.
                </p>
              )}
            </TabsContent>

            <TabsContent value="log">
              {releases.length === 0 ? (
                <EmptyState
                  icon={<RapideIcon width={26} height={26} />}
                  title="Aucune version publiée pour l'instant"
                  description="Le changelog apparaîtra ici dès la première publication."
                />
              ) : (
                <div className="grid gap-4">
                  {releases.map((file) => (
                    <article key={file.release.version} className="rounded-card border border-line bg-surface p-4">
                      <header className="flex items-center justify-between gap-3">
                        <b className="font-display">{file.release.version}</b>
                        <span className="text-[.85rem] text-muted">{formatDate(file.release.releasedAt)}</span>
                      </header>
                      {file.release.changelog ? (
                        <p className="mt-2 whitespace-pre-wrap text-[.92rem]">{file.release.changelog}</p>
                      ) : (
                        <p className="mt-2 text-[.92rem] text-muted">Pas de notes de version.</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <aside className="grid content-start gap-4 rounded-card-lg border border-line bg-surface p-5">
            <div>
              {product.price ? (
                <div className="flex items-center gap-2.5">
                  <b className="font-display text-[1.6rem] font-semibold tracking-[-.03em] tabular-nums">
                    {formatPriceCents(product.price.amountCents)}
                  </b>
                  <Badge variant="accent">Licence à vie</Badge>
                </div>
              ) : (
                <b className="font-display text-[1.15rem] font-semibold">Bientôt disponible</b>
              )}
            </div>

            {product.purchasable ? (
              <Button asChild fullWidth size="lg">
                <Link href="/connexion">
                  <PanierIcon width={18} height={18} /> Acheter la licence
                </Link>
              </Button>
            ) : (
              <Button fullWidth size="lg" disabled>
                <PanierIcon width={18} height={18} /> Achat bientôt disponible
              </Button>
            )}
            {product.purchasable && (
              <p className="text-[.85rem] text-muted">Vous serez invité à vous connecter avant le paiement.</p>
            )}

            <Button fullWidth variant="secondary" onClick={() => setTab("dl")}>
              <TelechargerIcon width={18} height={18} /> Télécharger gratuitement
            </Button>

            <ul className="grid gap-2 border-t border-line pt-4 text-[.88rem] text-muted">
              <li className="flex items-center gap-2.5">
                <CleIcon /> Paiement sécurisé par Stripe
              </li>
              <li className="flex items-center gap-2.5">
                <RapideIcon /> Clé livrée tout de suite
              </li>
              <li className="flex items-center gap-2.5">
                <SupportIcon /> Support sur Discord
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
