"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type {
  ConfigFileSummary,
  ConfigSchemaResponse,
  ConfigValues,
  SavedConfigResponse,
} from "@fondamental/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ParametresIcon } from "@/components/icons";
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
import { ConfigFields } from "./ConfigFields";

/** Délai avant de régénérer l'aperçu après une modification. */
const PREVIEW_DELAY_MS = 600;

type Plugin = { slug: string; name: string };

/**
 * Générateur de configuration (#30) : l'acheteur choisit un plugin et un fichier, remplit le
 * formulaire (généré depuis le schéma de l'API), voit le YAML en direct et le télécharge avec sa clé.
 */
export function ConfigGenerator() {
  const { csrfToken } = useSession();
  const [plugins, setPlugins] = useState<Plugin[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [plugin, setPlugin] = useState("");
  const [version, setVersion] = useState("");
  const [files, setFiles] = useState<ConfigFileSummary[]>([]);
  const [file, setFile] = useState("");
  const [schema, setSchema] = useState<ConfigSchemaResponse | null>(null);
  // Échec d'un plugin ou d'un fichier : n'empêche pas d'en choisir un autre.
  const [fileError, setFileError] = useState(false);
  const [values, setValues] = useState<ConfigValues>({});
  const [preview, setPreview] = useState("");
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<SavedConfigResponse[]>([]);
  const [current, setCurrent] = useState<SavedConfigResponse | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  // Valeurs d'une configuration enregistrée à appliquer une fois son schéma chargé.
  const pendingValues = useRef<ConfigValues | null>(null);

  // Plugins possédés (licences du compte dont le plugin est connu) et configurations enregistrées.
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

  // Plugin choisi : sa version la plus récente et ses fichiers.
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

  // Fichier choisi : schéma et valeurs livrées (ou celles de la configuration ouverte).
  useEffect(() => {
    if (!plugin || !version || !file) return;
    let cancelled = false;
    getConfigSchema({ slug: plugin, version, file })
      .then((res) => {
        if (cancelled) return;
        setFileError(false);
        setSchema(res);
        setValues(pendingValues.current ?? res.defaults);
        pendingValues.current = null;
      })
      .catch(() => !cancelled && setFileError(true));
    return () => {
      cancelled = true;
    };
  }, [plugin, version, file]);

  // Aperçu : rendu par l'API (clé comprise), après une courte pause dans la saisie.
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
              : ["L’aperçu n’a pas pu être généré. Réessayez dans un instant."],
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
    if (schema) setValues(schema.defaults);
  }

  /** Change de fichier affiché : l'ancien formulaire et son aperçu disparaissent le temps du chargement. */
  function switchTo(slug: string, next: string) {
    setSchema(null);
    setPreview("");
    setPreviewErrors([]);
    // Autre plugin : sa version et ses fichiers arrivent avec `getConfigPlugin`, pas avant.
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

  const savedOwned = useMemo(() => saved.filter((c) => plugins?.some((p) => p.slug === c.slug)), [saved, plugins]);

  if (loadError) {
    return (
      <Alert variant="error" title="Le générateur n’a pas pu être chargé">
        Réessayez dans un instant.
      </Alert>
    );
  }
  if (plugins === null) return <Skeleton className="h-64 w-full" />;
  if (plugins.length === 0) {
    return (
      <div className="grid gap-4 rounded-card-lg border border-line bg-surface p-5">
        <EmptyState
          icon={<ParametresIcon width={26} height={26} />}
          title="Réservé aux détenteurs d’une licence"
          description="Achetez un plugin, ou rattachez une clé existante dans « Mes licences », pour générer ses fichiers de configuration."
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-4 rounded-card-lg border border-line bg-surface p-5 sm:grid-cols-2">
        <Field label="Plugin" htmlFor="cfg-plugin">
          <Select id="cfg-plugin" value={plugin} onChange={(e) => choosePlugin(e.target.value)}>
            {plugins.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fichier" htmlFor="cfg-file" hint={files.find((f) => f.file === file)?.description}>
          <Select id="cfg-file" value={file} onChange={(e) => chooseFile(e.target.value)}>
            {files.map((f) => (
              <option key={f.file} value={f.file}>
                {f.file} — {f.label}
              </option>
            ))}
          </Select>
        </Field>
        {version && (
          <p className="text-[.82rem] text-muted sm:col-span-2">
            Pour la version <span className="font-mono text-text">{version}</span> du plugin. Ce que vous ne modifiez pas garde
            la valeur livrée avec le plugin, commentaires compris.
          </p>
        )}
      </div>

      {savedOwned.length > 0 && (
        <div className="grid gap-2 rounded-card-lg border border-line bg-surface p-5">
          <h2 className="font-display text-[1.05rem] font-semibold">Mes configurations</h2>
          <ul className="grid gap-1.5">
            {savedOwned.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-[.9rem]">
                <span>
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-muted">
                    · {plugins.find((p) => p.slug === c.slug)?.name} · {c.file}
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => open(c)}>
                    Ouvrir
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(c)}>
                    Supprimer
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fileError ? (
        <Alert variant="error" title="Ce fichier n’a pas pu être chargé">
          Réessayez dans un instant, ou choisissez un autre fichier.
        </Alert>
      ) : !schema ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ConfigFields fields={schema.fields} values={values} onChange={setValues} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:sticky lg:top-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[1.05rem] font-semibold">Aperçu de {schema.file}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={startOver}>
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
              <CodeBlock code={preview} copyLabel="Fichier" className="max-h-[70vh] overflow-y-auto" />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
            <div className="flex flex-wrap items-end gap-2">
              <Field
                label={current ? "Nom de la configuration" : "Enregistrer sous"}
                htmlFor="cfg-name"
                className="min-w-[200px] flex-1"
              >
                <Input
                  id="cfg-name"
                  value={name}
                  maxLength={64}
                  placeholder="Ex. Crates du lobby"
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Button variant="secondary" loading={saving} disabled={!name.trim() || previewErrors.length > 0} onClick={save}>
                {current ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>
            <p className="text-[.8rem] text-muted">
              Le fichier contient votre clé de licence : ne le partagez pas. Déposez-le dans{" "}
              <span className="font-mono">plugins/&lt;Plugin&gt;/</span>, puis rechargez le plugin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
