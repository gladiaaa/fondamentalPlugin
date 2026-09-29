"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ConfigFileSummary, ConfigSchemaResponse, ConfigValues, SavedConfigResponse } from "@fondamental/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ParametresIcon } from "@/components/icons";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session/SessionContext";
import { getLicenses } from "@/lib/api/account";
import { ApiRequestError } from "@/lib/api/client";
import {
  createSavedConfig,
  deleteSavedConfig,
  getConfigPlugin,
  getConfigSchema,
  listSavedConfigs,
  renderConfig,
  updateSavedConfig,
} from "@/lib/api/configs";
import { ConfigFields, MapLinks } from "./ConfigFields";
import { TagPreview } from "./MiniMessagePreview";
import { breadcrumb, generalFields, resolveNode, screenFields, setAt, type NodePath } from "./navigation";
import { isValues } from "./values";

/** Délai avant de régénérer le fichier après une modification. */
const PREVIEW_DELAY_MS = 600;

type Plugin = { slug: string; name: string };

/**
 * Configurateur (#30), page à part entière : l'acheteur choisit un plugin et un fichier, parcourt le
 * fichier section par section (une crate, un tag, une quête à la fois), voit l'aperçu en couleurs et
 * le fichier YAML en direct, puis le télécharge avec sa clé de licence.
 */
export function Configurator() {
  const { csrfToken } = useSession();
  const [plugins, setPlugins] = useState<Plugin[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [plugin, setPlugin] = useState("");
  const [version, setVersion] = useState("");
  const [files, setFiles] = useState<ConfigFileSummary[]>([]);
  const [file, setFile] = useState("");
  const [schema, setSchema] = useState<ConfigSchemaResponse | null>(null);
  const [fileError, setFileError] = useState(false);
  const [values, setValues] = useState<ConfigValues>({});
  const [path, setPath] = useState<NodePath>([]);
  const [preview, setPreview] = useState("");
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedConfigResponse[]>([]);
  const [current, setCurrent] = useState<SavedConfigResponse | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingValues = useRef<ConfigValues | null>(null);

  useEffect(() => {
    Promise.all([getLicenses(), listSavedConfigs()])
      .then(([licenses, configs]) => {
        const owned = new Map<string, Plugin>();
        for (const license of licenses) if (license.product) owned.set(license.product.slug, license.product);
        setPlugins([...owned.values()]);
        setSaved(configs);
        const first = [...owned.keys()][0];
        if (first) setPlugin(first);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    if (!plugin) return;
    getConfigPlugin(plugin)
      .then((res) => {
        setFileError(false);
        const latest = res.versions[0];
        setVersion(latest?.version ?? "");
        setFiles(latest?.files ?? []);
        setFile((f) => (latest?.files.some((x) => x.file === f) ? f : (latest?.files[0]?.file ?? "")));
      })
      .catch(() => setFileError(true));
  }, [plugin]);

  useEffect(() => {
    if (!plugin || !version || !file) return;
    let cancelled = false;
    getConfigSchema({ slug: plugin, version, file })
      .then((res) => {
        if (cancelled) return;
        setFileError(false);
        setSchema(res);
        // Premier écran : « Général », ou la première section si tout est rangé en sections.
        setPath(generalFields(res.fields).length > 0 ? [] : screenFields(res.fields).slice(0, 1).map((f) => f.key));
        setValues(pendingValues.current ?? res.defaults);
        pendingValues.current = null;
      })
      .catch(() => !cancelled && setFileError(true));
    return () => {
      cancelled = true;
    };
  }, [plugin, version, file]);

  useEffect(() => {
    if (!schema || !csrfToken || schema.slug !== plugin || schema.file !== file) return;
    const target = { slug: schema.slug, version: schema.version, file: schema.file };
    const timer = setTimeout(() => {
      renderConfig(target, values, csrfToken)
        .then((res) => {
          setPreview(res.yaml);
          setPreviewErrors([]);
        })
        .catch((error: unknown) => {
          setPreviewErrors(
            error instanceof ApiRequestError && error.code === "CONFIG_INVALID"
              ? error.messages
              : ["Le fichier n’a pas pu être généré. Réessayez dans un instant."],
          );
        });
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [values, schema, csrfToken, plugin, file]);

  const download = useCallback(() => {
    if (!preview || !schema) return;
    const url = URL.createObjectURL(new Blob([preview], { type: "text/yaml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = schema.file;
    link.click();
    URL.revokeObjectURL(url);
  }, [preview, schema]);

  function switchTo(slug: string, next: string) {
    setSchema(null);
    setPreview("");
    setPreviewErrors([]);
    setPath([]);
    if (slug !== plugin) {
      setVersion("");
      setFiles([]);
    }
    setPlugin(slug);
    setFile(next);
  }

  function choosePlugin(slug: string) {
    setCurrent(null);
    setName("");
    switchTo(slug, file);
  }

  function chooseFile(next: string) {
    setCurrent(null);
    setName("");
    switchTo(plugin, next);
  }

  async function save() {
    if (!schema || !csrfToken || !name.trim()) return;
    setSaving(true);
    try {
      const target = { slug: schema.slug, version: schema.version, file: schema.file };
      const result = current
        ? await updateSavedConfig(current.id, name.trim(), values, csrfToken)
        : await createSavedConfig(target, name.trim(), values, csrfToken);
      setCurrent(result);
      setSaved((list) => [result, ...list.filter((c) => c.id !== result.id)]);
      toast.success("Configuration enregistrée.");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.messages[0] : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function open(config: SavedConfigResponse) {
    setCurrent(config);
    setName(config.name);
    if (config.slug === plugin && config.file === file && config.version === version) {
      setValues(config.values);
      setPath([]);
    } else {
      pendingValues.current = config.values;
      switchTo(config.slug, config.file);
    }
  }

  async function remove(config: SavedConfigResponse) {
    if (!csrfToken) return;
    try {
      await deleteSavedConfig(config.id, csrfToken);
      setSaved((list) => list.filter((c) => c.id !== config.id));
      if (current?.id === config.id) {
        setCurrent(null);
        setName("");
      }
    } catch {
      toast.error("Suppression impossible.");
    }
  }

  function startOver() {
    setCurrent(null);
    setName("");
    setPath([]);
    if (schema) setValues(schema.defaults);
  }

  const savedOwned = useMemo(() => saved.filter((c) => plugins?.some((p) => p.slug === c.slug)), [saved, plugins]);

  if (loadError) {
    return (
      <Alert variant="error" title="Le configurateur n’a pas pu être chargé">
        Réessayez dans un instant.
      </Alert>
    );
  }
  if (plugins === null) return <Skeleton className="h-96 w-full" />;
  if (plugins.length === 0) {
    return (
      <div className="grid gap-4 rounded-card-lg border border-line bg-surface p-6">
        <EmptyState
          icon={<ParametresIcon width={26} height={26} />}
          title="Réservé aux détenteurs d’une licence"
          description="Achetez un plugin, ou rattachez une clé existante dans « Mes licences », pour configurer ses fichiers ici."
        />
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button asChild>
            <Link href="/plugins">Voir les plugins</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/compte/licences">Mes licences</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {/* Choix du plugin et du fichier */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-card-lg border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Plugin">
          {plugins.map((p) => {
            const Icon = PLUGIN_ICONS[p.slug];
            const active = p.slug === plugin;
            return (
              <button
                key={p.slug}
                type="button"
                aria-pressed={active}
                onClick={() => choosePlugin(p.slug)}
                className={cn(
                  "flex items-center gap-2 rounded-pill border px-3.5 py-2 text-[.9rem] font-medium transition-colors",
                  active ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-text" : "border-line text-muted hover:text-text",
                )}
              >
                {Icon && <Icon width={20} height={20} />}
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-4" role="tablist" aria-label="Fichier">
          {files.map((f) => (
            <button
              key={f.file}
              type="button"
              role="tab"
              aria-selected={f.file === file}
              onClick={() => chooseFile(f.file)}
              className={cn(
                "grid rounded-field px-3.5 py-2 text-left transition-colors",
                f.file === file ? "bg-surface-2 text-text shadow-[inset_0_0_0_1.5px_var(--color-accent)]" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span className="font-mono text-[.85rem]">{f.file}</span>
              <span className="text-[.78rem]">{f.label}</span>
            </button>
          ))}
          {version && (
            <span className="ml-auto self-center text-[.8rem] text-muted">
              Version <span className="font-mono text-text">{version}</span>
            </span>
          )}
        </div>
      </div>

      {fileError ? (
        <Alert variant="error" title="Ce fichier n’a pas pu être chargé">
          Réessayez dans un instant, ou choisissez un autre fichier.
        </Alert>
      ) : !schema ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_minmax(0,420px)]">
          <FileNavigation schema={schema} values={values} path={path} onNavigate={setPath} />

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
            <NodeEditor schema={schema} values={values} path={path} onChange={setValues} onNavigate={setPath} />
          </div>

          <aside className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[1.05rem] font-semibold">{schema.file}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={startOver}>
                  Repartir du fichier livré
                </Button>
                <Button size="sm" onClick={download} disabled={!preview || previewErrors.length > 0}>
                  Télécharger
                </Button>
              </div>
            </div>
            {previewErrors.length > 0 && (
              <Alert variant="error" title="À corriger avant de télécharger">
                <ul className="list-disc pl-5">
                  {previewErrors.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </Alert>
            )}
            {preview ? (
              <CodeBlock code={preview} copyLabel="Fichier" className="max-h-[60vh] overflow-y-auto text-[.78rem]" />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
            <p className="text-[.8rem] text-muted">
              Contient votre clé de licence : ne le partagez pas. À déposer dans{" "}
              <span className="font-mono">plugins/&lt;Plugin&gt;/</span>, puis rechargez le plugin.
            </p>

            <div className="grid gap-3 rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-end gap-2">
                <Field label={current ? "Nom de la configuration" : "Enregistrer sous"} htmlFor="cfg-name" className="min-w-[180px] flex-1">
                  <Input id="cfg-name" value={name} maxLength={64} placeholder="Ex. Crates du lobby" onChange={(e) => setName(e.target.value)} />
                </Field>
                <Button variant="secondary" loading={saving} disabled={!name.trim() || previewErrors.length > 0} onClick={save}>
                  {current ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </div>
              {savedOwned.length > 0 && (
                <ul className="grid gap-1.5 border-t border-line pt-3">
                  {savedOwned.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-[.88rem]">
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{c.name}</span>{" "}
                        <span className="text-muted">
                          · {plugins.find((p) => p.slug === c.slug)?.name} · {c.file}
                        </span>
                      </span>
                      <span className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => open(c)}>
                          Ouvrir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(c)}>
                          Supprimer
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Colonne de gauche : « Général », sections et listes du fichier ; menu déroulant sur petit écran. */
function FileNavigation({
  schema,
  values,
  path,
  onNavigate,
}: {
  schema: ConfigSchemaResponse;
  values: ConfigValues;
  path: NodePath;
  onNavigate: (path: NodePath) => void;
}) {
  const screens = screenFields(schema.fields);
  const hasGeneral = generalFields(schema.fields).length > 0;
  const items = [...(hasGeneral ? [{ key: "", label: "Général" }] : []), ...screens.map((f) => ({ key: f.key, label: f.label }))];
  const root = path[0] ?? "";

  return (
    <nav aria-label="Parties du fichier" className="grid gap-2 lg:sticky lg:top-4">
      <div className="lg:hidden">
        <Select aria-label="Partie du fichier" value={root} onChange={(e) => onNavigate(e.target.value ? [e.target.value] : [])}>
          {items.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <ul className="hidden gap-0.5 rounded-card border border-line bg-surface p-2 lg:grid">
        {items.map((item) => {
          const field = screens.find((f) => f.key === item.key);
          const entries = field?.kind === "map" && isValues(values[field.key]) ? Object.keys(values[field.key] as ConfigValues) : [];
          const active = root === item.key;
          return (
            <li key={item.key || "general"}>
              <button
                type="button"
                onClick={() => onNavigate(item.key ? [item.key] : [])}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-field px-3 py-2 text-left text-[.9rem] transition-colors",
                  active && path.length <= 1 ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <span className="truncate">
                  {item.label}
                  {field?.premium && <span className="ml-1 text-[.7rem] text-accent-text">Premium</span>}
                </span>
                {field?.kind === "map" && <span className="font-mono text-[.75rem] text-muted">{entries.length}</span>}
              </button>
              {active && entries.length > 0 && (
                <ul className="mb-1 ml-3 grid gap-0.5 border-l border-line pl-2">
                  {entries.map((entry) => (
                    <li key={entry}>
                      <button
                        type="button"
                        onClick={() => onNavigate([item.key, entry])}
                        className={cn(
                          "w-full truncate rounded-field px-2.5 py-1.5 text-left font-mono text-[.8rem] transition-colors",
                          path[1] === entry ? "bg-surface-2 text-text" : "text-muted hover:text-text",
                        )}
                      >
                        {entry}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Colonne centrale : l'écran de ce qui est choisi à gauche (une section, une liste, une entrée). */
function NodeEditor({
  schema,
  values,
  path,
  onChange,
  onNavigate,
}: {
  schema: ConfigSchemaResponse;
  values: ConfigValues;
  path: NodePath;
  onChange: (values: ConfigValues) => void;
  onNavigate: (path: NodePath) => void;
}) {
  const node = resolveNode(schema.fields, values, path);
  const crumbs = breadcrumb(schema.fields, path);

  // Entrée supprimée ou chemin périmé : retour à la racine.
  if (!node) {
    return (
      <Alert variant="info" title="Cet élément n’existe plus">
        <Button size="sm" variant="secondary" onClick={() => onNavigate([])}>
          Revenir au début du fichier
        </Button>
      </Alert>
    );
  }

  const header = (
    <div className="grid gap-1">
      {crumbs.length > 1 && (
        <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1 text-[.8rem] text-muted">
          {crumbs.map((label, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              {i < crumbs.length - 1 ? (
                <button type="button" className="hover:text-text" onClick={() => onNavigate(path.slice(0, i + 1))}>
                  {label}
                </button>
              ) : (
                <span className="text-text">{label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h2 className="font-display text-[1.25rem] font-semibold tracking-[-.02em]">
        {node.kind === "general" ? "Général" : node.kind === "entry" ? node.key : node.field.label}
      </h2>
      {node.kind !== "general" && node.kind !== "entry" && node.field.help && <p className="text-[.88rem] text-muted">{node.field.help}</p>}
    </div>
  );

  if (node.kind === "general") {
    return (
      <>
        {header}
        <ConfigFields fields={node.fields} values={values} onChange={onChange} />
      </>
    );
  }
  if (node.kind === "section") {
    return (
      <>
        {header}
        <ConfigFields fields={node.field.fields} values={node.values} onChange={(v) => onChange(setAt(values, path, v))} />
      </>
    );
  }
  if (node.kind === "map") {
    return (
      <>
        {header}
        <MapLinks
          field={node.field}
          value={node.values}
          onChange={(v) => onChange(setAt(values, path, v))}
          onOpen={(key) => onNavigate(key === null ? path : [...path, key])}
        />
      </>
    );
  }

  // Une entrée : aperçu en tête pour un tag de FondamentalTag, puis ses champs.
  const isTag = schema.slug === "tag" && schema.file === "tags.yml" && path[path.length - 2] === "tags";
  return (
    <>
      {header}
      {isTag && <TagPreview tag={node.values} />}
      <ConfigFields
        fields={node.map.fields ?? []}
        values={node.values}
        inEntry
        onChange={(v) => onChange(setAt(values, path, v))}
        onOpenEntry={(mapKey, entryKey) => onNavigate(entryKey === null ? [...path, mapKey] : [...path, mapKey, entryKey])}
      />
    </>
  );
}
