"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ConfigField, ConfigSchemaResponse, ConfigValues, SavedConfigResponse } from "@fondamental/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
import { ConfigFields } from "../ConfigFields";
import { Segments } from "../MiniMessagePreview";
import { parseMiniMessage, plainText } from "../minimessage";
import { Chest, McItem, type DragData } from "../minecraft/Chest";
import { ItemPalette } from "../minecraft/ItemPalette";
import { useMcItems } from "../minecraft/items";
import { isValues } from "../values";
import {
  articleIcon,
  articleProblem,
  CATEGORY_FILE,
  CATEGORY_ID,
  categoryLayout,
  commandLayout,
  DEFAULT_PANES,
  moveArticle,
  newArticleKey,
  type Panes,
} from "./layout";

const SLUG = "shop";
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
  const [panel, setPanel] = useState("article");
  const [page, setPage] = useState(0);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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
    return {
      article: (itemsField?.kind === "map" && itemsField.fields) || [],
      category: categorySchema?.fields.filter((f) => f.key !== "items") ?? [],
      command: (commandsField?.kind === "map" && commandsField.fields) || [],
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
    setPanel("article");
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
  const fileName = category ? `shops/${category.name}.yml` : CONFIG_FILE;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {/* Fichier en cours, enregistrement, téléchargement */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card-lg border border-line bg-surface px-4 py-3">
        <div className="grid min-w-0">
          <span className="truncate font-mono text-[.95rem]">{selection ? fileName : "Aucun menu choisi"}</span>
          <span className="text-[.8rem] text-muted">
            À déposer dans <span className="font-mono">plugins/FondamentalShop/{category ? "shops/" : ""}</span>, puis{" "}
            <span className="font-mono">/fshop reload</span>.
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-[.85rem]", dirty > 0 ? "text-warning" : "text-muted")} aria-live="polite">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", dirty > 0 ? "bg-warning" : "bg-success")} />
            {dirty > 0 ? `${dirty} fichier${dirty > 1 ? "s" : ""} à enregistrer` : "Tout est enregistré"}
          </span>
          <Button variant="secondary" onClick={downloadCurrent} disabled={!selection}>
            Télécharger {category ? `${category.name}.yml` : CONFIG_FILE}
          </Button>
          <Button onClick={saveAll} loading={saving} disabled={dirty === 0}>
            Enregistrer
          </Button>
        </div>
      </div>
      {errors.length > 0 && (
        <Alert variant="error" title="À corriger avant de télécharger">
          <ul className="list-disc pl-5">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_minmax(0,380px)]">
        {/* Arborescence : chaque commande et les catégories de son menu */}
        <nav
          aria-label="Menus de la boutique"
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-card border border-line bg-surface p-3 lg:sticky lg:top-4"
        >
          {savedConfigs.length > 1 && (
            <Field label="Configuration générale" htmlFor="shop-config">
              <Select id="shop-config" value={config.savedId ?? ""} onChange={(e) => switchConfig(e.target.value)}>
                {savedConfigs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <MenuGroup title="Ce que le joueur ouvre">
            {commandIds.map((id) => (
              <div key={id} className="grid min-w-0 gap-0.5">
                <MenuButton
                  active={selection?.kind === "command" && selection.id === id}
                  dirty={config.dirty}
                  onClick={() => select({ kind: "command", id })}
                >
                  <span className="font-mono text-[.88rem]">/{id}</span>
                </MenuButton>
                <ul className="ml-3 grid min-w-0 gap-0.5 border-l border-line pl-2">
                  {menuOf(id).map((name) => {
                    const doc = findCategory(name);
                    return (
                      <li key={name} className="min-w-0">
                        {doc ? (
                          <MenuButton
                            active={category === doc}
                            dirty={doc.dirty}
                            onClick={() => select({ kind: "category", name: doc.name, via: id })}
                          >
                            <McItem material={String(doc.values.icon ?? "CHEST")} items={items} size={22} />
                            <span className="truncate" title={`shops/${doc.name}.yml`}>
                              {plainText(String(doc.values.display ?? "")) || doc.name}
                            </span>
                          </MenuButton>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addCategory(name, id)}
                            className="flex w-full min-w-0 items-center gap-2 rounded-field px-2 py-1.5 text-left text-[.88rem] text-muted hover:bg-surface-2 hover:text-text"
                          >
                            <span aria-hidden className="h-[22px] w-[22px] shrink-0 rounded-[4px] border border-dashed border-line" />
                            <span className="truncate">{name}</span>
                            <span className="ml-auto shrink-0 text-[.75rem] font-medium text-accent-text">
                              {presetOf(name) ? "Ajouter" : "Créer"}
                            </span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                  {menuOf(id).length === 0 && <li className="px-2 py-1 text-[.8rem] text-muted">Aucune catégorie</li>}
                </ul>
              </div>
            ))}
          </MenuGroup>
          {orphans.length > 0 && (
            <MenuGroup title="Dans aucune commande" hint="Ajoutez leur nom aux catégories d’une commande pour qu’un joueur les voie.">
              {orphans.map((c) => (
                <MenuButton key={c.name} active={category === c} dirty={c.dirty} onClick={() => select({ kind: "category", name: c.name })}>
                  <McItem material={String(c.values.icon ?? "CHEST")} items={items} size={22} />
                  <span className="truncate">{plainText(String(c.values.display ?? "")) || c.name}</span>
                </MenuButton>
              ))}
            </MenuGroup>
          )}
          <form
            className="grid min-w-0 gap-1.5 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              addCategory(newName.trim());
            }}
          >
            <label htmlFor="shop-new-category" className="px-1 text-[.8rem] font-medium text-muted">
              Nouvelle catégorie
            </label>
            <div className="flex min-w-0 gap-1.5">
              <Input
                id="shop-new-category"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="armes"
                className="min-w-0 flex-1"
                maxLength={64}
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!CATEGORY_ID.test(newName.trim())}>
                Créer
              </Button>
            </div>
            <small className={cn("px-1 text-[.75rem]", newName.trim() !== "" && !CATEGORY_ID.test(newName.trim()) ? "text-error" : "text-muted")}>
              Nom du fichier shops/&lt;nom&gt;.yml : lettres, chiffres, - et _.
            </small>
          </form>
        </nav>

        {/* Scène : le menu tel que le joueur le voit */}
        <section aria-label="Aperçu du menu" className="grid min-w-0 content-start gap-4 rounded-card-lg border border-line bg-surface p-4 sm:p-5">
          {selection && (
            <ol aria-label="Chemin du joueur" className="flex flex-wrap items-center gap-1.5 text-[.95rem]">
              <li className="text-muted">{via || selection.kind === "command" ? "Le joueur tape" : "Aucune commande n’ouvre"}</li>
              {(selection.kind === "command" || via) && (
                <li>
                  <button
                    type="button"
                    disabled={selection.kind === "command"}
                    onClick={() => via && select({ kind: "command", id: via })}
                    className="rounded-pill bg-surface-2 px-3 py-1 font-mono text-[.88rem] enabled:hover:text-accent-text disabled:cursor-default"
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
                  <li className="flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-1 text-[.88rem]">
                    <McItem material={String(category.values.icon ?? "CHEST")} items={items} size={18} />
                    {plainText(String(category.values.display ?? "")) || category.name}
                  </li>
                </>
              )}
            </ol>
          )}

          {categories.length === 0 ? (
            <div className="grid justify-items-start gap-3 rounded-card border border-dashed border-line p-6 sm:p-8">
              <h2 className="font-display text-[1.25rem] font-semibold tracking-[-.02em]">Votre boutique n’a encore aucune catégorie</h2>
              <p className="max-w-[56ch] text-muted">
                Partez des catégories livrées avec le plugin ({(categorySchema.presets ?? []).map((p) => p.name).join(", ")}), puis changez les
                articles, les prix et les cases à votre goût. Vous pouvez aussi créer une catégorie vide à gauche.
              </p>
              {presets.length > 0 && <Button onClick={importPresets}>Partir des catégories du plugin</Button>}
            </div>
          ) : category ? (
            <CategoryChest
              doc={category}
              page={page}
              panes={panes}
              items={items}
              selected={article}
              onPage={setPage}
              onBack={via ? () => select({ kind: "command", id: via }) : undefined}
              onSelect={(key) => {
                setArticle(key);
                setPanel("article");
              }}
              onChange={(values) => editCategory(category.name, values)}
            />
          ) : command && selection?.kind === "command" ? (
            <CommandChest
              command={command}
              categories={categories}
              panes={panes}
              items={items}
              onOpen={(name) => select({ kind: "category", name, via: selection.id })}
              onMove={moveCategory}
            />
          ) : (
            <p className="py-10 text-center text-muted">Choisissez une commande ou une catégorie à gauche.</p>
          )}
        </section>

        {/* Réglages de ce qui est choisi */}
        <aside className="grid min-w-0 content-start gap-4 rounded-card-lg border border-line bg-surface p-4 sm:p-5 lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          {category ? (
            <Tabs value={panel} onValueChange={setPanel}>
              <TabsList>
                <TabsTrigger value="article">Article</TabsTrigger>
                <TabsTrigger value="category">Réglages de la catégorie</TabsTrigger>
              </TabsList>
              <TabsContent value="article" className="pt-4">
                {article && isValues(asValues(category.values.items)[article]) ? (
                  <ArticlePanel
                    id={article}
                    values={asValues(asValues(category.values.items)[article])}
                    fields={fields.article}
                    items={items}
                    onChange={(values) =>
                      editCategory(category.name, { ...category.values, items: { ...asValues(category.values.items), [article]: values } })
                    }
                    onRemove={() => {
                      const rest = { ...asValues(category.values.items) };
                      delete rest[article];
                      editCategory(category.name, { ...category.values, items: rest });
                      setArticle(undefined);
                    }}
                  />
                ) : (
                  <Gestures items={items} />
                )}
              </TabsContent>
              <TabsContent value="category" className="grid gap-4 pt-4">
                <ConfigFields fields={fields.category} values={category.values} onChange={(values) => editCategory(category.name, values)} />
                <Button variant="ghost" className="justify-self-start text-error" onClick={() => removeCategory(category)}>
                  Supprimer la catégorie
                </Button>
              </TabsContent>
            </Tabs>
          ) : command && selection?.kind === "command" ? (
            <div className="grid gap-4">
              <div className="grid gap-1">
                <h2 className="font-display text-[1.15rem] font-semibold">
                  Commande <span className="font-mono">/{selection.id}</span>
                </h2>
                <p className="text-[.88rem] text-muted">
                  Ouvre ce menu. Il montre les catégories de la liste « Catégories » ci-dessous, dans cet ordre ; liste vide, il les montre toutes.
                </p>
              </div>
              <ConfigFields
                fields={fields.command}
                values={command}
                inEntry
                onChange={(values) => editConfig({ ...config.values, commands: { ...commands, [selection.id]: values } })}
              />
              <p className="text-[.82rem] text-muted">
                Pour ajouter ou renommer une commande, et pour le reste du fichier :{" "}
                <Link href="/configurateur" className="text-accent-text hover:underline">
                  le configurateur
                </Link>
                .
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function MenuGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
      <h2 className="px-1 text-[.8rem] font-medium text-muted">{title}</h2>
      {children}
      {hint && <p className="px-1 text-[.75rem] text-muted">{hint}</p>}
    </div>
  );
}

function MenuButton({ active, dirty, onClick, children }: { active: boolean; dirty: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-field px-2 py-1.5 text-left text-[.9rem] transition-colors",
        active ? "bg-surface-2 font-medium text-text shadow-[inset_2px_0_0_var(--color-accent)]" : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {children}
      {dirty && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-label="modifié, pas encore enregistré" />}
    </button>
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

/** En-tête d'un article (son icône et son nom comme en jeu, ses prix) et son formulaire. */
function ArticlePanel({
  id,
  values,
  fields,
  items,
  onChange,
  onRemove,
}: {
  id: string;
  values: ConfigValues;
  fields: ConfigField[];
  items: ReturnType<typeof useMcItems>;
  onChange: (values: ConfigValues) => void;
  onRemove: () => void;
}) {
  const problem = articleProblem(values);
  const prices = [typeof values.buy === "number" && `achat ${values.buy}`, typeof values.sell === "number" && `revente ${values.sell}`].filter(
    Boolean,
  );
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-card bg-surface-2 p-3">
        <McItem material={articleIcon(values)} items={items} size={40} />
        <div className="grid min-w-0">
          <span className="truncate text-[1.02rem] font-medium">
            <Segments segments={parseMiniMessage(String(values.name ?? id))} />
          </span>
          <span className="truncate text-[.8rem] text-muted">
            <span className="font-mono">{id}</span>
            {prices.length > 0 ? `, ${prices.join(", ")}` : ""}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Retirer
        </Button>
      </div>
      {problem && (
        <Alert variant="warning" title="Pas encore en vente">
          Le plugin l’ignore tant qu’il manque ceci : {problem}.
        </Alert>
      )}
      <ConfigFields fields={fields} values={values} inEntry onChange={onChange} />
    </div>
  );
}

/** Coffre d'une catégorie et liste des objets : glisser, déposer, cliquer. */
function CategoryChest({
  doc,
  page,
  panes,
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
      <div className="flex flex-wrap items-start gap-5">
        <div className="grid min-w-0 max-w-full gap-2">
          <div className="max-w-full overflow-x-auto p-0.5 xl:[zoom:1.2] 2xl:[zoom:1.45]">
            <Chest layout={layout} items={items} selected={selected} onSelect={onSelect} onDrop={drop} onBack={onBack} />
          </div>
          {layout.pages > 1 && (
            <div className="flex items-center justify-center gap-2 text-[.85rem]">
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
        </div>
        <div className="min-w-[220px] flex-1">
          <ItemPalette
            items={items}
            onPick={
              selected && isValues(articles[selected])
                ? (material) => setItems({ ...articles, [selected]: withMaterial(articles[selected] as ConfigValues, material) })
                : undefined
            }
            pickLabel={
              selected
                ? `Glissez un objet dans le coffre, ou cliquez-le pour l’appliquer à « ${selected} ».`
                : "Glissez un objet dans une case vide pour créer un article, ou sur un article pour changer son objet."
            }
          />
        </div>
      </div>
      {ignored.length > 0 && (
        <div className="grid gap-1.5 rounded-field border border-warning/40 p-3 text-[.88rem]">
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

/** Menu d'une commande avec ses catégories : cliquer en ouvre une, la glisser change sa case. */
function CommandChest({
  command,
  categories,
  panes,
  items,
  onOpen,
  onMove,
}: {
  command: ConfigValues;
  categories: Doc[];
  panes: Panes;
  items: ReturnType<typeof useMcItems>;
  onOpen: (name: string) => void;
  onMove: (name: string, slot: number) => void;
}) {
  const byId = new Map(categories.filter((c) => c.values.enabled !== false).map((c) => [c.name.toLowerCase(), c]));
  const wanted = Array.isArray(command.categories) ? command.categories.filter((x): x is string => typeof x === "string") : [];
  const ids = wanted.length > 0 ? wanted : [...byId.keys()].sort();
  const found = ids.flatMap((id) => byId.get(id.toLowerCase()) ?? []);
  const layout = commandLayout(
    command,
    found.map((c) => ({ id: c.name, values: c.values })),
    panes,
  );

  return (
    <>
      {wanted.length === 1 ? (
        <p className="text-[.92rem] text-muted">
          Une seule catégorie : la commande ouvre directement{" "}
          <button type="button" className="font-medium text-accent-text hover:underline" onClick={() => onOpen(found[0]?.name ?? wanted[0])}>
            {wanted[0]}
          </button>
          , sans ce menu.
        </p>
      ) : (
        <div className="max-w-full overflow-x-auto p-0.5 xl:[zoom:1.2] 2xl:[zoom:1.45]">
          <Chest layout={layout} items={items} onSelect={onOpen} onDrop={(slot, data) => data.key && onMove(data.key, slot)} />
        </div>
      )}
      <p className="text-[.85rem] text-muted">Cliquez une catégorie pour y entrer, comme le joueur. Glissez-la pour changer sa case.</p>
      {found.length === 0 && <p className="text-[.92rem] text-muted">Aucune catégorie créée pour ce menu : ajoutez-en depuis la liste à gauche.</p>}
    </>
  );
}

/** Ce que signifient les cases du coffre. */
function Legend({ items, back }: { items: ReturnType<typeof useMcItems>; back: boolean }) {
  const slot = "relative grid h-7 w-7 shrink-0 place-items-center bg-[#8B8B8B] shadow-[inset_1px_1px_0_#373737,inset_-1px_-1px_0_#FFFFFF]";
  return (
    <ul aria-label="Légende" className="grid max-w-[60ch] gap-2 text-[.82rem] text-muted sm:grid-cols-2">
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
