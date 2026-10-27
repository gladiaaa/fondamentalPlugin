"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ConfigField, ConfigSchemaResponse, ConfigValues, SavedConfigResponse } from "@fondamental/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session/SessionContext";
import { getLicenses } from "@/lib/api/account";
import { ApiRequestError } from "@/lib/api/client";
import {
  createSavedConfig,
  deleteSavedConfig,
  getConfigPlugin,
  getConfigSchema,
  importConfig,
  listSavedConfigs,
  renderConfig,
  updateSavedConfig,
} from "@/lib/api/configs";
import { ConfigFields } from "../ConfigFields";
import { DeliveryCard, Section, SectionFields } from "./ArticleSettings";
import { YamlPane } from "./YamlPane";
import { Segments } from "../MiniMessagePreview";
import { parseMiniMessage, plainText, type Palette } from "../minimessage";
import { Chest, McItem, type DragData } from "../minecraft/Chest";
import { ItemPalette } from "../minecraft/ItemPalette";
import { useMcItems } from "../minecraft/items";
import { isValues } from "../values";
import {
  articleIcon,
  articleProblem,
  CATEGORY_FILE,
  CATEGORY_ID,
  clampRows,
  categoryLayout,
  commandLayout,
  DEFAULT_PANES,
  moveArticle,
  newArticleKey,
  type Panes,
} from "./layout";

const SLUG = "shop";
/** Nom d'une commande de boutique (config.yml > commands), sans « / ». */
const COMMAND_ID = /^[a-z0-9_-]{1,32}$/;
const CONFIG_FILE = "config.yml";

/** Un fichier ouvert dans l'éditeur : enregistré (`savedId`) ou pas encore. */
interface Doc {
  savedId?: string;
  name: string;
  values: ConfigValues;
  dirty: boolean;
}

/** Menu affiché ; `via` = commande depuis laquelle on a ouvert la catégorie (chemin du joueur). */
type Selection = { kind: "category"; name: string; via?: string } | { kind: "command"; id: string };

const toDoc = (c: SavedConfigResponse): Doc => ({ savedId: c.id, name: c.name, values: c.values, dirty: false });
const asValues = (v: unknown): ConfigValues => (isValues(v) ? v : {});
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const byUpdate = (a: SavedConfigResponse, b: SavedConfigResponse) => b.updatedAt.localeCompare(a.updatedAt);

/** Change l'objet d'un article : ce qu'il livre (objet), sinon son icône. */
function withMaterial(article: ConfigValues, material: string): ConfigValues {
  const type = typeof article.type === "string" ? article.type : "item";
  return type === "item" ? { ...article, material } : { ...article, icon: material };
}

function download(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/yaml;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Éditeur visuel des menus de FondamentalShop (`/configurateur/boutique`), façon inventaire Minecraft :
 * les menus à gauche (commandes de config.yml, catégories de shops/), le coffre et les objets au centre,
 * le formulaire de l'article ou du menu choisi à droite. Les fichiers sont ceux du configurateur.
 */
export function ShopEditor() {
  const { csrfToken } = useSession();
  const items = useMcItems();
  const [status, setStatus] = useState<"loading" | "error" | "no-license" | "ready">("loading");
  const [version, setVersion] = useState("");
  const [categorySchema, setCategorySchema] = useState<ConfigSchemaResponse | null>(null);
  const [configSchema, setConfigSchema] = useState<ConfigSchemaResponse | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfigResponse[]>([]);
  const [config, setConfig] = useState<Doc | null>(null);
  const [categories, setCategories] = useState<Doc[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [article, setArticle] = useState<string | undefined>();
  const [creating, setCreating] = useState<false | "category" | "command">(false);
  /** Catégorie choisie dans le menu d'une commande (son bouton, ses réglages). */
  const [menuCat, setMenuCat] = useState<string | undefined>();
  /** Mode « Fichier YAML » : le fichier du menu affiché, modifiable à la main, à la place des réglages. */
  const [yamlMode, setYamlMode] = useState(false);
  const [page, setPage] = useState(0);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getLicenses(), listSavedConfigs(), getConfigPlugin(SLUG)])
      .then(async ([licenses, saved, plugin]) => {
        if (!licenses.some((l) => l.product?.slug === SLUG)) return setStatus("no-license");
        const v = plugin.versions[0]?.version ?? "";
        const [cat, cfg] = await Promise.all([
          getConfigSchema({ slug: SLUG, version: v, file: CATEGORY_FILE }),
          getConfigSchema({ slug: SLUG, version: v, file: CONFIG_FILE }),
        ]);
        const configs = saved.filter((c) => c.slug === SLUG && c.file === CONFIG_FILE).sort(byUpdate);
        const cats = saved.filter((c) => c.slug === SLUG && c.file === CATEGORY_FILE).map(toDoc);
        const conf = configs[0] ? toDoc(configs[0]) : { name: "Boutique", values: cfg.defaults, dirty: false };
        setVersion(v);
        setCategorySchema(cat);
        setConfigSchema(cfg);
        setSavedConfigs(configs);
        setConfig(conf);
        setCategories(cats);
        const firstCommand = Object.keys(asValues(conf.values.commands))[0];
        setSelection(firstCommand ? { kind: "command", id: firstCommand } : cats[0] ? { kind: "category", name: cats[0].name } : null);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const dirty = (config?.dirty ? 1 : 0) + categories.filter((c) => c.dirty).length;

  // Modifications non enregistrées : le navigateur demande confirmation avant de quitter.
  useEffect(() => {
    if (dirty === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const fields = useMemo(() => {
    const itemsField = categorySchema?.fields.find((f) => f.key === "items");
    const commandsField = configSchema?.fields.find((f) => f.key === "commands");
    const menusField = configSchema?.fields.find((f) => f.key === "menus");
    return {
      article: (itemsField?.kind === "map" && itemsField.fields) || [],
      category: categorySchema?.fields.filter((f) => f.key !== "items") ?? [],
      command: (commandsField?.kind === "map" && commandsField.fields) || [],
      menus: (menusField?.kind === "section" && menusField.fields) || [],
    } satisfies Record<string, ConfigField[]>;
  }, [categorySchema, configSchema]);

  if (status === "loading") return <Skeleton className="h-[560px] w-full" />;
  if (status === "error" || !config || !categorySchema || !configSchema) {
    if (status === "no-license") {
      return (
        <Alert variant="info" title="Réservé aux détenteurs d’une licence FondamentalShop">
          <Link href="/plugins/shop" className="font-medium text-accent-text hover:underline">
            Voir FondamentalShop
          </Link>
        </Alert>
      );
    }
    return (
      <Alert variant="error" title="L’éditeur n’a pas pu être chargé">
        Réessayez dans un instant.
      </Alert>
    );
  }

  const menus = asValues(config.values.menus);
  // Couleurs du serveur (colors: de config.yml) : titres, noms et infobulles comme en jeu.
  const colorValues = asValues(config.values.colors);
  const palette: Palette = {
    colors: Object.fromEntries(Object.entries(colorValues).filter((e): e is [string, string] => typeof e[1] === "string")),
    degrade: strings(colorValues.degrade).length > 0 ? strings(colorValues.degrade) : undefined,
  };
  const panes: Panes = {
    border: typeof menus.border === "string" && menus.border ? menus.border : DEFAULT_PANES.border,
    accent: typeof menus.accent === "string" && menus.accent ? menus.accent : DEFAULT_PANES.accent,
  };
  const commands = asValues(config.values.commands);
  const category = selection?.kind === "category" ? categories.find((c) => c.name === selection.name) : undefined;
  const command = selection?.kind === "command" ? asValues(commands[selection.id]) : undefined;

  function select(next: Selection) {
    setSelection(next);
    setArticle(undefined);
    setMenuCat(undefined);
    setPage(0);
    setErrors([]);
  }

  const editCategory = (name: string, values: ConfigValues) =>
    setCategories((list) => list.map((c) => (c.name === name ? { ...c, values, dirty: true } : c)));
  const editConfig = (values: ConfigValues) => setConfig((c) => c && { ...c, values, dirty: true });

  /** Catégories livrées avec le plugin (shops/blocs.yml…) pas encore dans l'éditeur. */
  const presets = (categorySchema.presets ?? []).filter((p) => !categories.some((c) => c.name.toLowerCase() === p.name.toLowerCase()));
  const presetOf = (name: string) => categorySchema.presets?.find((p) => p.name.toLowerCase() === name.toLowerCase());

  /** Ouvre la catégorie `name`, en la créant si besoin : depuis le fichier livré du même nom, sinon vide. */
  function addCategory(name: string, via?: string) {
    if (!CATEGORY_ID.test(name)) return;
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      // Catégorie vide, sans case imposée : seuls les réglages généraux du fichier livré (lignes, activation…) sont repris.
      const base = { ...categorySchema!.defaults };
      delete base.items;
      delete base.slot;
      const values = presetOf(name)?.values ?? {
        ...base,
        display: `<accent>${name[0].toUpperCase()}${name.slice(1)}`,
        icon: "CHEST",
        lore: [],
        items: {},
      };
      setCategories((list) => [...list, { name, values, dirty: true }]);
    }
    setNewName("");
    select({ kind: "category", name: existing?.name ?? name, via });
  }

  function importPresets() {
    setCategories((list) => [...list, ...presets.map((p) => ({ name: p.name, values: p.values, dirty: true }))]);
    toast.success(
      `${presets.length} catégorie${presets.length > 1 ? "s" : ""} ajoutée${presets.length > 1 ? "s" : ""}. Enregistrez pour les garder.`,
    );
  }

  /** Change la case d'une catégorie dans le menu d'une commande ; celle qui l'occupait prend l'ancienne. */
  function moveCategory(name: string, slot: number) {
    const moved = categories.find((c) => c.name === name);
    if (!moved) return;
    const from = moved.values.slot;
    setCategories((list) =>
      list.map((c) => {
        if (c === moved) return { ...c, values: { ...c.values, slot }, dirty: true };
        if (c.values.slot !== slot) return c;
        const rest = { ...c.values };
        if (typeof from === "number") rest.slot = from;
        else delete rest.slot;
        return { ...c, values: rest, dirty: true };
      }),
    );
  }

  async function removeCategory(doc: Doc) {
    if (!window.confirm(`Supprimer la catégorie « ${doc.name} » de vos configurations ?`)) return;
    if (doc.savedId && csrfToken) {
      try {
        await deleteSavedConfig(doc.savedId, csrfToken);
      } catch {
        toast.error("Suppression impossible.");
        return;
      }
    }
    setCategories((list) => list.filter((c) => c !== doc));
    setSelection(null);
  }

  async function saveAll() {
    if (!csrfToken) return;
    setSaving(true);
    const target = (file: string) => ({ slug: SLUG, version, file });
    const save = (doc: Doc, file: string) =>
      doc.savedId
        ? updateSavedConfig(doc.savedId, doc.name, doc.values, csrfToken)
        : createSavedConfig(target(file), doc.name, doc.values, csrfToken);
    try {
      if (config!.dirty) {
        const result = await save(config!, CONFIG_FILE);
        setConfig({ ...toDoc(result) });
        setSavedConfigs((list) => [result, ...list.filter((c) => c.id !== result.id)]);
      }
      for (const doc of categories.filter((c) => c.dirty)) {
        const result = await save(doc, CATEGORY_FILE);
        setCategories((list) => list.map((c) => (c.name === doc.name ? toDoc(result) : c)));
      }
      toast.success("Menus enregistrés.");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.messages[0] : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  /**
   * Fichiers du serveur de l'acheteur : config.yml remplace la configuration générale, tout autre
   * fichier est la catégorie shops/<nom>.yml du même nom (créée ou remplacée). Rien n'est enregistré
   * avant « Enregistrer ».
   */
  async function importFiles(files: FileList | null) {
    if (!files || !csrfToken) return;
    const notes: string[] = [];
    let opened: Selection | null = null;
    for (const file of Array.from(files)) {
      const name = file.name.replace(/\.ya?ml$/i, "");
      const isConfig = name === "config";
      if (!isConfig && !CATEGORY_ID.test(name)) {
        notes.push(`${file.name} : nom de fichier invalide (lettres, chiffres, - et _).`);
        continue;
      }
      try {
        const res = await importConfig({ slug: SLUG, version, file: isConfig ? CONFIG_FILE : CATEGORY_FILE }, await file.text(), csrfToken);
        notes.push(...res.ignored.map((m) => `${file.name} › ${m}`));
        if (isConfig) {
          setConfig((c) => c && { ...c, values: res.values, dirty: true });
        } else {
          setCategories((list) =>
            list.some((c) => c.name === name)
              ? list.map((c) => (c.name === name ? { ...c, values: res.values, dirty: true } : c))
              : [...list, { name, values: res.values, dirty: true }],
          );
          opened ??= { kind: "category", name };
        }
      } catch (error) {
        notes.push(`${file.name} : ${error instanceof ApiRequestError ? error.messages[0] : "lecture impossible."}`);
      }
    }
    setIgnored(notes);
    if (opened) select(opened);
    toast.success(`${files.length} fichier${files.length > 1 ? "s" : ""} lu${files.length > 1 ? "s" : ""}. Enregistrez pour les garder.`);
  }

  async function downloadCurrent() {
    if (!csrfToken) return;
    const [doc, file, filename] = category ? [category, CATEGORY_FILE, `${category.name}.yml`] : [config!, CONFIG_FILE, CONFIG_FILE];
    try {
      const res = await renderConfig({ slug: SLUG, version, file }, doc.values, csrfToken);
      setErrors([]);
      download(res.yaml, filename);
    } catch (error) {
      setErrors(error instanceof ApiRequestError && error.code === "CONFIG_INVALID" ? error.messages : ["Le fichier n’a pas pu être généré."]);
    }
  }

  function switchConfig(id: string) {
    const next = savedConfigs.find((c) => c.id === id);
    if (!next || (config!.dirty && !window.confirm("Abandonner les modifications de la configuration générale ?"))) return;
    setConfig(toDoc(next));
    select({ kind: "command", id: Object.keys(asValues(next.values.commands))[0] ?? "" });
  }

  const commandIds = Object.keys(commands);
  const findCategory = (name: string) => categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  /** Catégories que montre le menu d'une commande, dans l'ordre (liste vide = toutes, comme le plugin). */
  const menuOf = (id: string) => {
    const wanted = strings(asValues(commands[id]).categories);
    return wanted.length > 0
      ? wanted
      : categories
          .filter((c) => c.values.enabled !== false)
          .map((c) => c.name)
          .sort();
  };
  const linked = new Set(commandIds.flatMap((id) => menuOf(id).map((n) => n.toLowerCase())));
  const orphans = categories.filter((c) => !linked.has(c.name.toLowerCase()));
  /** Commande d'où l'on vient pour la catégorie affichée (chemin du joueur, flèche « Retour »). */
  const via =
    selection?.kind === "category"
      ? (selection.via ?? commandIds.find((id) => menuOf(id).some((n) => n.toLowerCase() === selection.name.toLowerCase())))
      : undefined;
  const byCategoryKeys = (...keys: string[]) => keys.flatMap((k) => fields.category.filter((f) => f.key === k));
  const byKeys = (...keys: string[]) => keys.flatMap((k) => fields.article.filter((f) => f.key === k));
  const label = (doc: Doc) => plainText(String(doc.values.display ?? "")) || doc.name;
  const articles = category ? asValues(category.values.items) : {};
  const current = article && isValues(articles[article]) ? (articles[article] as ConfigValues) : undefined;
  const setArticles = (next: ConfigValues) => category && editCategory(category.name, { ...category.values, items: next });
  // Sélecteur de menu : « c:<nom> » une catégorie, « m:<commande> » une commande, « a:<commande>:<nom> » une catégorie à ajouter.
  const menuValue = selection?.kind === "command" ? `m:${selection.id}` : category ? `c:${category.name}` : "";

  function chooseMenu(value: string) {
    const [kind, a, b] = value.split(":");
    if (kind === "m") select({ kind: "command", id: a });
    else if (kind === "c") select({ kind: "category", name: a });
    else if (kind === "a") addCategory(b, a);
    else if (kind === "new") setCreating("category");
    else if (kind === "newcmd") setCreating("command");
  }

  /** Catégories du menu de la commande `id`, dans l'ordre ; écrites en liste explicite dès qu'on les change. */
  const setMenuList = (id: string, names: string[]) =>
    editConfig({ ...config.values, commands: { ...commands, [id]: { ...asValues(commands[id]), categories: names } } });

  function createCommand(id: string) {
    if (!COMMAND_ID.test(id)) return;
    if (!commands[id]) editConfig({ ...config!.values, commands: { ...commands, [id]: { rows: 5, categories: [] } } });
    setNewName("");
    select({ kind: "command", id });
  }

  function removeCommand(id: string) {
    if (!window.confirm(`Supprimer la commande /${id} ? Ses catégories restent dans vos fichiers.`)) return;
    const rest = { ...commands };
    delete rest[id];
    editConfig({ ...config!.values, commands: rest });
    setSelection(null);
  }

  return (
    <div className="atelier grid grid-cols-[minmax(0,1fr)] gap-2.5 text-[.85rem]">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-card border border-line bg-surface px-3 py-2">
        <ToolGroup label="Menu">
          {creating ? (
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (creating === "command") createCommand(newName.trim());
                else addCategory(newName.trim());
                setCreating(false);
              }}
            >
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={creating === "command" ? "commande sans /, ex. grades" : "nom du fichier, ex. armes"}
                aria-label={creating === "command" ? "Nom de la nouvelle commande" : "Nom de la nouvelle catégorie (shops/<nom>.yml)"}
                aria-invalid={newName.trim() !== "" && !(creating === "command" ? COMMAND_ID : CATEGORY_ID).test(newName.trim())}
                className="w-48"
                maxLength={64}
              />
              <Button type="submit" size="sm" disabled={!(creating === "command" ? COMMAND_ID : CATEGORY_ID).test(newName.trim())}>
                Créer
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Annuler
              </Button>
            </form>
          ) : (
            <Select aria-label="Menu affiché" value={menuValue} onChange={(e) => chooseMenu(e.target.value)} className="w-60">
              {menuValue === "" && <option value="">Choisir un menu</option>}
              {commandIds.map((id) => (
                <optgroup key={id} label={`/${id}`}>
                  <option value={`m:${id}`}>/{id} (menu de la commande)</option>
                  {menuOf(id).map((name) => {
                    const doc = findCategory(name);
                    return doc ? (
                      <option key={name} value={`c:${doc.name}`}>
                        › {label(doc)}
                        {doc.dirty ? " •" : ""}
                      </option>
                    ) : (
                      <option key={name} value={`a:${id}:${name}`}>
                        › {name} ({presetOf(name) ? "ajouter depuis le plugin" : "créer"})
                      </option>
                    );
                  })}
                </optgroup>
              ))}
              {orphans.length > 0 && (
                <optgroup label="Dans aucune commande">
                  {orphans.map((c) => (
                    <option key={c.name} value={`c:${c.name}`}>
                      {label(c)}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="newcmd">+ Nouvelle commande…</option>
              <option value="new">+ Nouvelle catégorie…</option>
            </Select>
          )}
        </ToolGroup>
        {savedConfigs.length > 1 && (
          <ToolGroup label="config.yml">
            <Select aria-label="Configuration générale" value={config.savedId ?? ""} onChange={(e) => switchConfig(e.target.value)} className="w-44">
              {savedConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </ToolGroup>
        )}
        {category && (
          <>
            <ToolGroup label="Nom dans le menu">
              <Input
                value={String(category.values.display ?? "")}
                onChange={(e) => editCategory(category.name, { ...category.values, display: e.target.value })}
                className="w-56 font-mono"
                aria-label="Nom de la catégorie dans le menu (MiniMessage)"
              />
            </ToolGroup>
            <ToolGroup label="Lignes">
              <Select
                aria-label="Lignes du menu"
                value={String(clampRows(category.values.rows, 6))}
                onChange={(e) => editCategory(category.name, { ...category.values, rows: Number(e.target.value) })}
                className="w-20"
              >
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </ToolGroup>
          </>
        )}
        {command && selection?.kind === "command" && (
          <>
            <ToolGroup label="Titre du menu">
              <Input
                value={String(command.title ?? "")}
                placeholder="<degrade>Boutique</degrade>"
                onChange={(e) => editConfig({ ...config.values, commands: { ...commands, [selection.id]: { ...command, title: e.target.value } } })}
                className="w-56 font-mono"
                aria-label="Titre du menu (MiniMessage)"
              />
            </ToolGroup>
            <ToolGroup label="Lignes">
              <Select
                aria-label="Lignes du menu"
                value={String(clampRows(command.rows, 5))}
                onChange={(e) =>
                  editConfig({ ...config.values, commands: { ...commands, [selection.id]: { ...command, rows: Number(e.target.value) } } })
                }
                className="w-20"
              >
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </ToolGroup>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-[.8rem]", dirty > 0 ? "text-warning" : "text-muted")} aria-live="polite">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", dirty > 0 ? "bg-warning" : "bg-success")} />
            {dirty > 0 ? `${dirty} fichier${dirty > 1 ? "s" : ""} à enregistrer` : "Tout est enregistré"}
          </span>
          <label className="inline-flex cursor-pointer items-center rounded-pill px-3 py-1.5 text-[.82rem] font-semibold shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:shadow-[inset_0_0_0_1.5px_var(--color-accent)] focus-within:shadow-[var(--focus-ring)]">
            Importer mes fichiers
            <input
              type="file"
              accept=".yml,.yaml"
              multiple
              className="sr-only"
              onChange={(e) => {
                void importFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <Button
            size="sm"
            variant={yamlMode ? "primary" : "secondary"}
            aria-pressed={yamlMode}
            disabled={!selection}
            onClick={() => setYamlMode((m) => !m)}
          >
            Fichier YAML
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadCurrent} disabled={!selection} title={downloadHint(!!category)}>
            Télécharger {category ? `${category.name}.yml` : CONFIG_FILE}
          </Button>
          <Button size="sm" onClick={saveAll} loading={saving} disabled={dirty === 0}>
            Enregistrer
          </Button>
        </div>
      </div>
      {ignored.length > 0 && (
        <Alert variant="warning" title="Pas repris de vos fichiers">
          <ul className="list-disc pl-5">
            {ignored.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <button type="button" className="mt-1 text-accent-text hover:underline" onClick={() => setIgnored([])}>
            Masquer
          </button>
        </Alert>
      )}
      {errors.length > 0 && (
        <Alert variant="error" title="À corriger avant de télécharger">
          <ul className="list-disc pl-5">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-2.5 xl:h-[calc(100dvh-9.5rem)] xl:min-h-[560px] lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(380px,.85fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Objets */}
        <aside
          aria-label="Objets Minecraft"
          className="order-last max-h-[60vh] min-h-0 overflow-y-auto rounded-card lg:order-none lg:max-h-none border border-line bg-surface p-2.5"
        >
          {category ? (
            <ItemPalette
              items={items}
              tall
              onPick={current ? (material) => setArticles({ ...articles, [article!]: withMaterial(current, material) }) : undefined}
              pickLabel={
                current
                  ? `Cliquez un objet pour l’appliquer à « ${article} », ou glissez-le dans le coffre.`
                  : "Glissez un objet dans une case vide du coffre : l’article est créé."
              }
            />
          ) : command ? (
            <ItemPalette
              items={items}
              tall
              onPick={
                menuCat && findCategory(menuCat)
                  ? (material) => editCategory(findCategory(menuCat)!.name, { ...findCategory(menuCat)!.values, icon: material })
                  : undefined
              }
              pickLabel={
                menuCat
                  ? `Cliquez un objet pour en faire l’icône de « ${menuCat} », ou glissez-le sur une catégorie.`
                  : "Glissez un objet sur une catégorie du menu pour changer son icône."
              }
            />
          ) : (
            <p className="p-2 text-muted">Choisissez un menu dans la barre du haut.</p>
          )}
        </aside>

        {/* Plan de travail : le menu tel que le joueur le voit */}
        <section
          aria-label="Aperçu du menu"
          className="relative grid min-h-[420px] min-w-0 content-center justify-items-center gap-4 overflow-auto rounded-card border border-line p-4"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--color-accent-3) 22%, transparent), transparent 70%), repeating-linear-gradient(0deg, transparent 0 31px, color-mix(in srgb, var(--color-line) 55%, transparent) 31px 32px), repeating-linear-gradient(90deg, transparent 0 31px, color-mix(in srgb, var(--color-line) 55%, transparent) 31px 32px), var(--color-bg)",
          }}
        >
          {selection && (
            <ol aria-label="Chemin du joueur" className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 text-[.82rem]">
              <li className="text-muted">{via || selection.kind === "command" ? "Le joueur tape" : "Aucune commande n’ouvre"}</li>
              {(selection.kind === "command" || via) && (
                <li>
                  <button
                    type="button"
                    disabled={selection.kind === "command"}
                    onClick={() => via && select({ kind: "command", id: via })}
                    className="rounded-pill bg-surface-2 px-2.5 py-0.5 font-mono enabled:hover:text-accent-text disabled:cursor-default"
                  >
                    /{selection.kind === "command" ? selection.id : via}
                  </button>
                </li>
              )}
              {category && (
                <>
                  {via && (
                    <li aria-hidden className="text-muted">
                      ›
                    </li>
                  )}
                  <li className="flex items-center gap-1.5 rounded-pill bg-surface-2 px-2.5 py-0.5">
                    <McItem material={String(category.values.icon ?? "CHEST")} items={items} size={16} />
                    {label(category)}
                  </li>
                </>
              )}
            </ol>
          )}

          {categories.length === 0 && (
            <div className="grid max-w-[52ch] justify-items-center gap-2 rounded-card border border-line bg-surface p-4 text-center">
              <h2 className="font-display text-[1rem] font-semibold">Aucune catégorie pour l’instant</h2>
              <p className="text-muted">
                Importez vos fichiers <span className="font-mono">shops/*.yml</span>, partez des catégories du plugin (
                {(categorySchema.presets ?? []).map((p) => p.name).join(", ")}) ou créez-en une.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {presets.length > 0 && (
                  <Button size="sm" onClick={importPresets}>
                    Partir des catégories du plugin
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setCreating("category")}>
                  Créer une catégorie vide
                </Button>
              </div>
            </div>
          )}
          {category ? (
            <CategoryChest
              doc={category}
              page={page}
              panes={panes}
              palette={palette}
              items={items}
              selected={article}
              onPage={setPage}
              onBack={via ? () => select({ kind: "command", id: via }) : undefined}
              onSelect={(key) => setArticle(key)}
              onChange={(values) => editCategory(category.name, values)}
            />
          ) : command && selection?.kind === "command" ? (
            <CommandChest
              command={command}
              categories={categories}
              panes={panes}
              palette={palette}
              items={items}
              selected={menuCat}
              onSelect={setMenuCat}
              onOpen={(name) => select({ kind: "category", name, via: selection.id })}
              onMove={moveCategory}
              onIcon={(name, material) => {
                const doc = findCategory(name);
                if (doc) editCategory(doc.name, { ...doc.values, icon: material });
                setMenuCat(name);
              }}
            />
          ) : (
            <p className="text-muted">Choisissez un menu dans la barre du haut.</p>
          )}
        </section>

        {/* Réglages : deux colonnes, comme « Item stack » et « Button » */}
        <div className="grid min-h-0 min-w-0 gap-2.5 md:grid-cols-2 lg:col-span-2 xl:contents">
          {yamlMode && csrfToken && (category || (command && selection?.kind === "command")) ? (
            <Panel
              title={category ? `shops/${category.name}.yml` : CONFIG_FILE}
              onClose={() => setYamlMode(false)}
              className="md:col-span-2 xl:col-span-2"
            >
              <YamlPane
                target={{ slug: SLUG, version, file: category ? CATEGORY_FILE : CONFIG_FILE }}
                values={category ? category.values : config.values}
                csrfToken={csrfToken}
                onChange={(values) => (category ? editCategory(category.name, values) : editConfig(values))}
              />
            </Panel>
          ) : category && current ? (
            <>
              <Panel title="Objet affiché" onClose={() => setArticle(undefined)}>
                <ArticleHead
                  id={article!}
                  values={current}
                  items={items}
                  palette={palette}
                  onRemove={() => {
                    const rest = { ...articles };
                    delete rest[article!];
                    setArticles(rest);
                    setArticle(undefined);
                  }}
                />
                <Section title="Affichage dans le menu" hint="nom, description, icône, case" open>
                  <SectionFields
                    fields={byKeys("name", "lore", "icon", "slot")}
                    values={current}
                    onChange={(values) => setArticles({ ...articles, [article!]: values })}
                  />
                </Section>
              </Panel>
              <Panel title="Vente">
                <div className="grid gap-1.5">
                  <h3 className="text-[.78rem] font-medium text-muted">Au clic, le joueur reçoit</h3>
                  <DeliveryCard
                    article={current}
                    fields={fields.article}
                    items={items}
                    onChange={(values) => setArticles({ ...articles, [article!]: values })}
                  />
                </div>
                {SALE_SECTIONS.map((section) => (
                  <Section key={section.group} title={section.title} hint={section.hint} open={section.open}>
                    <SectionFields
                      fields={fields.article.filter((f) => f.group === section.group)}
                      values={current}
                      onChange={(values) => setArticles({ ...articles, [article!]: values })}
                    />
                  </Section>
                ))}
              </Panel>
            </>
          ) : category ? (
            <>
              <Panel title="Article">
                <Gestures items={items} />
              </Panel>
              <Panel title="Réglages de la catégorie">
                <ConfigFields
                  fields={fields.category.filter((f) => f.key !== "display" && f.key !== "rows")}
                  values={category.values}
                  onChange={(values) => editCategory(category.name, values)}
                />
                <Button size="sm" variant="ghost" className="justify-self-start text-error" onClick={() => removeCategory(category)}>
                  Supprimer la catégorie
                </Button>
              </Panel>
            </>
          ) : command && selection?.kind === "command" ? (
            <>
              {menuCat && findCategory(menuCat) ? (
                <Panel title={`Catégorie dans /${selection.id}`} onClose={() => setMenuCat(undefined)}>
                  {(() => {
                    const doc = findCategory(menuCat)!;
                    const onChange = (values: ConfigValues) => editCategory(doc.name, values);
                    return (
                      <>
                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-field bg-surface-2 p-2">
                          <McItem material={String(doc.values.icon ?? "CHEST")} items={items} size={32} />
                          <div className="grid min-w-0">
                            <span className="truncate font-medium">
                              <Segments segments={parseMiniMessage(String(doc.values.display ?? doc.name), palette)} />
                            </span>
                            <span className="truncate font-mono text-[.75rem] text-muted">shops/{doc.name}.yml</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => select({ kind: "category", name: doc.name, via: selection.id })}>
                            Ouvrir son contenu
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMenuList(
                                selection.id,
                                menuOf(selection.id).filter((n) => n.toLowerCase() !== doc.name.toLowerCase()),
                              );
                              setMenuCat(undefined);
                            }}
                          >
                            Retirer de /{selection.id}
                          </Button>
                        </div>
                        <Section title="Bouton dans le menu" hint="nom, icône, description, case" open>
                          <SectionFields fields={byCategoryKeys("display", "icon", "lore", "slot")} values={doc.values} onChange={onChange} />
                        </Section>
                        <Section title="Accès" hint="activée, permission">
                          <SectionFields fields={byCategoryKeys("enabled", "permission")} values={doc.values} onChange={onChange} />
                        </Section>
                      </>
                    );
                  })()}
                </Panel>
              ) : (
                <Panel title={`Catégories de /${selection.id}`}>
                  <p className="text-muted">
                    Dans l’ordre du menu. Cliquez une catégorie dans le coffre pour régler son bouton ; double-cliquez pour entrer dedans.
                  </p>
                  {strings(command.categories).length === 0 && (
                    <p className="text-[.78rem] text-muted">
                      Aucune liste dans config.yml : ce menu montre toutes vos catégories. Retirer ou réordonner en crée une.
                    </p>
                  )}
                  <ul className="grid gap-0.5">
                    {menuOf(selection.id).map((name, i, list) => {
                      const doc = findCategory(name);
                      const move = (to: number) => {
                        const next = [...list];
                        next.splice(i, 1);
                        next.splice(to, 0, name);
                        setMenuList(selection.id, next);
                      };
                      return (
                        <li key={name} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => (doc ? setMenuCat(doc.name) : addCategory(name, selection.id))}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-field px-2 py-1.5 text-left hover:bg-surface-2"
                          >
                            {doc ? (
                              <McItem material={String(doc.values.icon ?? "CHEST")} items={items} size={20} />
                            ) : (
                              <span aria-hidden className="h-5 w-5 shrink-0 rounded-[4px] border border-dashed border-line" />
                            )}
                            <span className={cn("truncate", !doc && "text-muted")}>{doc ? label(doc) : name}</span>
                            {!doc && <span className="ml-auto text-[.75rem] text-accent-text">{presetOf(name) ? "Ajouter" : "Créer"}</span>}
                          </button>
                          <IconAction label={`Monter ${name}`} disabled={i === 0} onClick={() => move(i - 1)}>
                            ↑
                          </IconAction>
                          <IconAction label={`Descendre ${name}`} disabled={i === list.length - 1} onClick={() => move(i + 1)}>
                            ↓
                          </IconAction>
                          <IconAction
                            label={`Retirer ${name} de /${selection.id}`}
                            onClick={() =>
                              setMenuList(
                                selection.id,
                                list.filter((n) => n !== name),
                              )
                            }
                          >
                            ×
                          </IconAction>
                        </li>
                      );
                    })}
                  </ul>
                  {(() => {
                    const inMenu = new Set(menuOf(selection.id).map((n) => n.toLowerCase()));
                    const choices = [
                      ...categories.map((c) => c.name),
                      ...(categorySchema.presets ?? []).map((p) => p.name).filter((n) => !findCategory(n)),
                    ].filter((n) => !inMenu.has(n.toLowerCase()));
                    return (
                      choices.length > 0 && (
                        <Select
                          aria-label={`Ajouter une catégorie à /${selection.id}`}
                          value=""
                          onChange={(e) => e.target.value && setMenuList(selection.id, [...menuOf(selection.id), e.target.value])}
                        >
                          <option value="">+ Ajouter une catégorie à ce menu…</option>
                          {choices.map((n) => (
                            <option key={n} value={n}>
                              {findCategory(n) ? label(findCategory(n)!) : `${n} (catégorie du plugin)`}
                            </option>
                          ))}
                        </Select>
                      )
                    );
                  })()}
                  {presets.length > 0 && categories.length > 0 && (
                    <Button size="sm" variant="secondary" className="justify-self-start" onClick={importPresets}>
                      Ajouter toutes les catégories du plugin
                    </Button>
                  )}
                </Panel>
              )}
              <Panel title={`Commande /${selection.id}`}>
                <SectionFields
                  fields={fields.command.filter((f) => !["title", "rows", "categories"].includes(f.key))}
                  values={command}
                  onChange={(values) => editConfig({ ...config.values, commands: { ...commands, [selection.id]: values } })}
                />
                <Section title="Apparence de tous les menus" hint="vitres du cadre">
                  <SectionFields
                    fields={fields.menus}
                    values={asValues(config.values.menus)}
                    onChange={(values) => editConfig({ ...config.values, menus: values })}
                  />
                </Section>
                <Button size="sm" variant="ghost" className="justify-self-start text-error" onClick={() => removeCommand(selection.id)}>
                  Supprimer la commande /{selection.id}
                </Button>
              </Panel>
            </>
          ) : null}
        </div>
      </div>
      <p className="px-1 text-[.78rem] text-muted">{downloadHint(!!category)}</p>
    </div>
  );
}

/** Sections repliables de « Vente », dans l'ordre (groupes du schéma de l'article). */
const SALE_SECTIONS = [
  { group: "Prix", title: "Prix", hint: "achat, revente, monnaie", open: true },
  { group: "Règles", title: "Règles d’achat", hint: "quantité, limites, délai, permission", open: false },
  { group: "Premium", title: "Stock et promotion", hint: "Premium", open: false },
];

const downloadHint = (category: boolean) =>
  category
    ? "Fichier à déposer dans plugins/FondamentalShop/shops/, puis /fshop reload."
    : "Fichier à déposer dans plugins/FondamentalShop/, puis /fshop reload.";

function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-[.72rem] font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Colonne de réglages (« Item stack », « Button » sur MIB). */
function Panel({ title, onClose, className, children }: { title: string; onClose?: () => void; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col rounded-card border border-line bg-surface", className)}>
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-[.8rem] font-semibold">{title}</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={`Fermer ${title}`} className="text-muted hover:text-text">
            ×
          </button>
        )}
      </header>
      <div className="grid min-h-0 content-start gap-3 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

/** Les trois gestes de l'éditeur, montrés tant qu'aucun article n'est choisi. */
function Gestures({ items }: { items: ReturnType<typeof useMcItems> }) {
  const gestures = [
    { from: "DIAMOND", to: null, text: "Glissez un objet de la liste dans une case vide : l’article est créé, il ne reste qu’à lui donner un prix." },
    {
      from: "IRON_INGOT",
      to: "IRON_INGOT",
      text: "Glissez un article sur une autre case pour le déplacer ; s’il y en a déjà un, les deux s’échangent.",
    },
    { from: "GOLD_INGOT", to: "WRITABLE_BOOK", text: "Cliquez un article pour régler son prix, sa quantité, ses limites et ce qu’il livre." },
  ];
  return (
    <div className="grid gap-4">
      <h2 className="font-display text-[1.1rem] font-semibold">Remplir ce menu</h2>
      <ul className="grid gap-3.5">
        {gestures.map((g) => (
          <li key={g.text} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <span aria-hidden className="flex items-center gap-1 rounded-field bg-surface-2 p-1.5">
              <McItem material={g.from} items={items} size={24} />
              {g.to && (
                <>
                  <span className="text-muted">›</span>
                  <McItem material={g.to} items={items} size={24} />
                </>
              )}
            </span>
            <p className="text-[.9rem]">{g.text}</p>
          </li>
        ))}
      </ul>
      <p className="text-[.82rem] text-muted">
        Sans souris : chaque article a aussi un champ « Case », et un clic sur un objet de la liste l’applique à l’article choisi.
      </p>
    </div>
  );
}

/** En-tête d'un article : son icône et son nom comme en jeu, ses prix, et ce qui lui manque pour être en vente. */
function ArticleHead({
  id,
  values,
  items,
  palette,
  onRemove,
}: {
  id: string;
  values: ConfigValues;
  items: ReturnType<typeof useMcItems>;
  palette: Palette;
  onRemove: () => void;
}) {
  const problem = articleProblem(values);
  const prices = [typeof values.buy === "number" && `achat ${values.buy}`, typeof values.sell === "number" && `revente ${values.sell}`].filter(
    Boolean,
  );
  return (
    <>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-field bg-surface-2 p-2">
        <McItem material={articleIcon(values)} items={items} size={32} />
        <div className="grid min-w-0">
          <span className="truncate font-medium">
            <Segments segments={parseMiniMessage(String(values.name ?? id), palette)} />
          </span>
          <span className="truncate text-[.75rem] text-muted">
            <span className="font-mono">{id}</span>
            {prices.length > 0 ? `, ${prices.join(", ")}` : ""}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Retirer
        </Button>
      </div>
      {problem && <p className="rounded-field border border-warning/40 px-2.5 py-1.5 text-warning">Pas encore en vente : {problem}.</p>}
    </>
  );
}

/** Coffre d'une catégorie et liste des objets : glisser, déposer, cliquer. */
function CategoryChest({
  doc,
  page,
  panes,
  palette,
  items,
  selected,
  onPage,
  onSelect,
  onBack,
  onChange,
}: {
  doc: Doc;
  page: number;
  panes: Panes;
  palette: Palette;
  items: ReturnType<typeof useMcItems>;
  selected?: string;
  onPage: (page: number) => void;
  onSelect: (key: string) => void;
  onBack?: () => void;
  onChange: (values: ConfigValues) => void;
}) {
  const values = doc.values;
  const articles = asValues(values.items);
  const layout = categoryLayout(values, page, panes);
  const ignored = Object.entries(articles).flatMap(([key, a]) => {
    const problem = isValues(a) ? articleProblem(a) : "article vide";
    return problem ? [{ key, problem }] : [];
  });
  const setItems = (next: ConfigValues) => onChange({ ...values, items: next });

  function drop(slot: number, data: DragData) {
    if (data.key) return setItems(moveArticle(articles, data.key, slot));
    if (!data.material) return;
    const occupant = layout.slots[slot];
    if (occupant.kind === "entry" && occupant.key && isValues(articles[occupant.key])) {
      setItems({ ...articles, [occupant.key]: withMaterial(articles[occupant.key] as ConfigValues, data.material) });
      return onSelect(occupant.key);
    }
    const key = newArticleKey(articles, data.material);
    setItems({ ...articles, [key]: { material: data.material, slot } });
    onSelect(key);
  }

  return (
    <>
      <div className="max-w-full overflow-x-auto p-0.5 2xl:[zoom:1.2]">
        <Chest layout={layout} items={items} palette={palette} selected={selected} onSelect={onSelect} onDrop={drop} onBack={onBack} />
      </div>
      {layout.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="ghost" disabled={layout.page === 0} onClick={() => onPage(layout.page - 1)}>
            Page précédente
          </Button>
          <span className="tabular-nums text-muted">
            {layout.page + 1} / {layout.pages}
          </span>
          <Button size="sm" variant="ghost" disabled={layout.page >= layout.pages - 1} onClick={() => onPage(layout.page + 1)}>
            Page suivante
          </Button>
        </div>
      )}
      <Legend items={items} back={!!onBack} />
      {ignored.length > 0 && (
        <div className="grid max-w-[60ch] gap-1 rounded-field border border-warning/40 bg-surface p-2.5">
          <p className="font-medium text-warning">Ignorés par le plugin tant qu’ils sont incomplets :</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {ignored.map(({ key, problem }) => (
              <li key={key}>
                <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => onSelect(key)}>
                  {key}
                </button>{" "}
                <span className="text-muted">({problem})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * Menu d'une commande avec ses catégories : cliquer en choisit une (son bouton se règle à droite),
 * double-cliquer y entre, la glisser change sa case, y déposer un objet change son icône.
 */
function CommandChest({
  command,
  categories,
  panes,
  palette,
  items,
  selected,
  onSelect,
  onOpen,
  onMove,
  onIcon,
}: {
  command: ConfigValues;
  categories: Doc[];
  panes: Panes;
  palette: Palette;
  items: ReturnType<typeof useMcItems>;
  selected?: string;
  onSelect: (name: string) => void;
  onOpen: (name: string) => void;
  onMove: (name: string, slot: number) => void;
  onIcon: (name: string, material: string) => void;
}) {
  const byId = new Map(categories.filter((c) => c.values.enabled !== false).map((c) => [c.name.toLowerCase(), c]));
  const wanted = strings(command.categories);
  const ids = wanted.length > 0 ? wanted : [...byId.keys()].sort();
  const found = ids.flatMap((id) => byId.get(id.toLowerCase()) ?? []);
  const layout = commandLayout(
    command,
    found.map((c) => ({ id: c.name, values: c.values })),
    panes,
  );

  return (
    <>
      {wanted.length === 1 && (
        <p className="max-w-[52ch] text-center text-muted">
          Une seule catégorie : en jeu, /commande ouvre directement{" "}
          <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => onOpen(found[0]?.name ?? wanted[0])}>
            {wanted[0]}
          </button>{" "}
          sans passer par ce menu.
        </p>
      )}
      <div className="max-w-full overflow-x-auto p-0.5 2xl:[zoom:1.2]">
        <Chest
          layout={layout}
          items={items}
          palette={palette}
          selected={selected}
          onSelect={onSelect}
          onActivate={onOpen}
          onDrop={(slot, data) => {
            if (data.key) return onMove(data.key, slot);
            const target = layout.slots[slot];
            if (data.material && target.kind === "entry" && target.key) onIcon(target.key, data.material);
          }}
        />
      </div>
      <p className="text-muted">Cliquez une catégorie pour régler son bouton, double-cliquez pour y entrer. Glissez-la pour changer sa case.</p>
      {found.length === 0 && <p className="text-muted">Aucune catégorie dans ce menu : ajoutez-en depuis la colonne de droite.</p>}
    </>
  );
}

/** Petit bouton d'action d'une liste (monter, descendre, retirer). */
function IconAction({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-field text-muted hover:bg-surface-2 hover:text-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Ce que signifient les cases du coffre. */
function Legend({ items, back }: { items: ReturnType<typeof useMcItems>; back: boolean }) {
  const slot = "relative grid h-7 w-7 shrink-0 place-items-center bg-[#8B8B8B] shadow-[inset_1px_1px_0_#373737,inset_-1px_-1px_0_#FFFFFF]";
  return (
    <ul aria-label="Légende" className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[.78rem] text-muted">
      <li className="flex items-center gap-2">
        <span aria-hidden className={slot}>
          <McItem material="STONE" items={items} size={22} />
        </span>
        Article à sa propre case
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className={slot}>
          <McItem material="STONE" items={items} size={22} />
          <span className="absolute bottom-0 right-0.5 text-[9px] leading-none text-white [text-shadow:1px_1px_0_#3f3f3f]">A</span>
        </span>
        Placé automatiquement, à la suite
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className={cn(slot, "bg-[#c06a6a]")}>
          <McItem material="DIAMOND" items={items} size={22} />
        </span>
        Incomplet : absent en jeu
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className={slot}>
          <McItem material="ARROW" items={items} size={22} />
        </span>
        {back ? "Bouton du plugin ; la flèche ramène au menu" : "Bouton du plugin, case réservée"}
      </li>
    </ul>
  );
}
