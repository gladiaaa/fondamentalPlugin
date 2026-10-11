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

type Selection = { kind: "category"; name: string } | { kind: "command"; id: string };

const toDoc = (c: SavedConfigResponse): Doc => ({ savedId: c.id, name: c.name, values: c.values, dirty: false });
const asValues = (v: unknown): ConfigValues => (isValues(v) ? v : {});
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

  function createCategory() {
    const name = newName.trim();
    if (!CATEGORY_ID.test(name) || categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    // Catégorie vide, sans case imposée : seuls les réglages généraux du fichier livré (lignes, activation…) sont repris.
    const base = { ...categorySchema!.defaults };
    delete base.items;
    delete base.slot;
    const values = { ...base, display: `<accent>${name[0].toUpperCase()}${name.slice(1)}`, icon: "CHEST", lore: [], items: {} };
    setCategories((list) => [...list, { name, values, dirty: true }]);
    setNewName("");
    select({ kind: "category", name });
  }

  /** Catégories livrées avec le plugin (shops/blocs.yml…) pas encore dans l'éditeur. */
  const presets = (categorySchema.presets ?? []).filter((p) => !categories.some((c) => c.name.toLowerCase() === p.name.toLowerCase()));

  function importPresets() {
    setCategories((list) => [...list, ...presets.map((p) => ({ name: p.name, values: p.values, dirty: true }))]);
    if (presets[0] && !selection) select({ kind: "category", name: presets[0].name });
    toast.success(`${presets.length} catégorie${presets.length > 1 ? "s" : ""} importée${presets.length > 1 ? "s" : ""} : pensez à enregistrer.`);
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

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center gap-3 rounded-card-lg border border-line bg-surface px-4 py-3">
        <McItem material={category ? String(category.values.icon ?? "CHEST") : "CHEST"} items={items} />
        <div className="grid min-w-0">
          <span className="truncate font-display text-[1.05rem] font-semibold">
            {category ? `shops/${category.name}.yml` : selection?.kind === "command" ? `/${selection.id}` : "Éditeur de menus"}
          </span>
          <span className="text-[.8rem] text-muted">
            {dirty > 0
              ? `${dirty} fichier${dirty > 1 ? "s" : ""} modifié${dirty > 1 ? "s" : ""}, pas encore enregistré${dirty > 1 ? "s" : ""}`
              : "Tout est enregistré"}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
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

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,380px)]">
        {/* Menus */}
        <nav aria-label="Menus" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-card border border-line bg-surface p-3 lg:sticky lg:top-4">
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
          <MenuGroup title="Commandes" hint={config.savedId ? undefined : "Celles du config.yml livré."}>
            {Object.keys(commands).map((id) => (
              <MenuButton
                key={id}
                active={selection?.kind === "command" && selection.id === id}
                onClick={() => select({ kind: "command", id })}
                dirty={config.dirty}
              >
                <McItem material="CHEST" items={items} size={22} />/{id}
              </MenuButton>
            ))}
          </MenuGroup>
          <MenuGroup title="Catégories">
            {categories.map((c) => (
              <MenuButton key={c.name} active={category === c} onClick={() => select({ kind: "category", name: c.name })} dirty={c.dirty}>
                <McItem material={String(c.values.icon ?? "CHEST")} items={items} size={22} />
                <span className="truncate">{c.name}</span>
              </MenuButton>
            ))}
            {presets.length > 0 && (
              <div className="mt-1 grid grid-cols-[minmax(0,1fr)] gap-1">
                <Button size="sm" variant="secondary" className="whitespace-normal! py-2" onClick={importPresets}>
                  Importer les catégories livrées
                </Button>
                <small className="px-1 text-[.75rem] text-muted">{presets.map((p) => p.name).join(", ")}</small>
              </div>
            )}
            <form
              className="mt-1 flex min-w-0 gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                createCategory();
              }}
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ressources"
                aria-label="Nom de la nouvelle catégorie"
                className="min-w-0 flex-1"
                maxLength={64}
              />
              <Button type="submit" size="sm" variant="secondary" disabled={!CATEGORY_ID.test(newName.trim())}>
                Créer
              </Button>
            </form>
            {newName.trim() !== "" && !CATEGORY_ID.test(newName.trim()) && (
              <small className="text-[.78rem] text-error">Lettres, chiffres, - et _ : c’est le nom du fichier shops/&lt;nom&gt;.yml.</small>
            )}
          </MenuGroup>
        </nav>

        {/* Coffre */}
        <div className="grid min-w-0 gap-4 rounded-card-lg border border-line bg-surface p-4 sm:p-5">
          {category ? (
            <CategoryChest
              doc={category}
              page={page}
              panes={panes}
              items={items}
              selected={article}
              onPage={setPage}
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
              onOpen={(name) => select({ kind: "category", name })}
              onMove={(name, slot) => {
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
              }}
            />
          ) : (
            <p className="py-10 text-center text-muted">Choisissez un menu à gauche, ou créez une catégorie.</p>
          )}
        </div>

        {/* Formulaire */}
        <aside className="grid min-w-0 gap-4 rounded-card-lg border border-line bg-surface p-4 sm:p-5 lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          {category ? (
            <Tabs value={panel} onValueChange={setPanel}>
              <TabsList>
                <TabsTrigger value="article">Article</TabsTrigger>
                <TabsTrigger value="category">Catégorie</TabsTrigger>
              </TabsList>
              <TabsContent value="article" className="pt-4">
                {article && isValues(asValues(category.values.items)[article]) ? (
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3">
                      <McItem material={articleIcon(asValues(asValues(category.values.items)[article]))} items={items} />
                      <h2 className="min-w-0 flex-1 truncate font-display text-[1.15rem] font-semibold">{article}</h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const rest = { ...asValues(category.values.items) };
                          delete rest[article];
                          editCategory(category.name, { ...category.values, items: rest });
                          setArticle(undefined);
                        }}
                      >
                        Retirer
                      </Button>
                    </div>
                    <ConfigFields
                      fields={fields.article}
                      values={asValues(asValues(category.values.items)[article])}
                      inEntry
                      onChange={(values) =>
                        editCategory(category.name, { ...category.values, items: { ...asValues(category.values.items), [article]: values } })
                      }
                    />
                  </div>
                ) : (
                  <p className="text-[.92rem] text-muted">
                    Cliquez un article dans le coffre pour le modifier, ou glissez un objet de la liste dans une case vide pour en créer un.
                  </p>
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
              <h2 className="font-display text-[1.15rem] font-semibold">Commande /{selection.id}</h2>
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
        "flex min-w-0 items-center gap-2 rounded-field px-2 py-1.5 text-left text-[.9rem] transition-colors",
        active ? "bg-surface-2 font-medium text-text" : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      {children}
      {dirty && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-label="modifié" />}
    </button>
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
  onChange,
}: {
  doc: Doc;
  page: number;
  panes: Panes;
  items: ReturnType<typeof useMcItems>;
  selected?: string;
  onPage: (page: number) => void;
  onSelect: (key: string) => void;
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
            <Chest layout={layout} items={items} selected={selected} onSelect={onSelect} onDrop={drop} />
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
          <p className="max-w-[52ch] text-[.8rem] text-muted">
            Glissez un article pour lui donner sa propre case ; « A » = placé automatiquement. Les boutons du plugin (retour, pages, solde) gardent
            leur place.
          </p>
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
  const missing = ids.filter((id) => !byId.has(id.toLowerCase()));
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
      <p className="text-[.82rem] text-muted">Cliquez une catégorie pour l’ouvrir, glissez-la pour changer sa case dans ce menu.</p>
      {missing.length > 0 && (
        <p className="text-[.88rem] text-warning">
          Pas encore créées ici : {missing.join(", ")}. Elles s’afficheront en jeu si leur fichier existe, mais pas dans cet aperçu.
        </p>
      )}
      {found.length === 0 && missing.length === 0 && <p className="text-[.92rem] text-muted">Aucune catégorie : créez-en une à gauche.</p>}
    </>
  );
}
