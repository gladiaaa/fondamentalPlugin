"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ConfigField, ConfigValues } from "@fondamental/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { ConfigFields } from "../ConfigFields";
import { McItem } from "../minecraft/Chest";
import type { useMcItems } from "../minecraft/items";

type Items = ReturnType<typeof useMcItems>;

/** Ce qu'un article donne au joueur qui l'achète (`type`), avec les champs propres à chacun. */
export const DELIVERIES: { type: string; label: string; text: string; icon: string; fields: string[] }[] = [
  {
    type: "item",
    label: "Objet",
    text: "Donne un objet : Minecraft, ItemsAdder, Oraxen ou Nexo. Le seul type que le joueur peut aussi revendre.",
    icon: "DIAMOND",
    fields: ["material", "amount", "item-name", "item-lore", "custom-model-data", "enchantments"],
  },
  {
    type: "crate-key",
    label: "Clé de caisse",
    text: "Donne des clés virtuelles de FondamentalCrate.",
    icon: "TRIPWIRE_HOOK",
    fields: ["crate", "amount"],
  },
  {
    type: "rank",
    label: "Grade",
    text: "Ajoute un groupe LuckPerms, à vie ou pour une durée. Un grade à vie déjà possédé ne se rachète pas.",
    icon: "GOLDEN_HELMET",
    fields: ["group", "duration"],
  },
  {
    type: "permission",
    label: "Permission",
    text: "Donne une permission, à vie ou pour une durée (vol, /pv…).",
    icon: "PAPER",
    fields: ["node", "duration"],
  },
  { type: "tag", label: "Tag", text: "Débloque un tag de FondamentalTag, à vie ou pour une durée.", icon: "NAME_TAG", fields: ["tag", "duration"] },
  {
    type: "command",
    label: "Commandes",
    text: "Lance une ou plusieurs commandes depuis la console : annonce, récompense d’un autre plugin…",
    icon: "COMMAND_BLOCK",
    fields: ["commands"],
  },
  {
    type: "info",
    label: "Vitrine",
    text: "Rien à acheter : une description et un lien cliquable vers votre boutique en ligne.",
    icon: "BOOK",
    fields: ["link"],
  },
];

const typeOf = (a: ConfigValues) => (typeof a.type === "string" ? a.type : "item");
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Ce que l'article donne, en une phrase. */
function summary(a: ConfigValues): string {
  const amount = typeof a.amount === "number" ? a.amount : 1;
  const duration = str(a.duration) ? `pendant ${a.duration}` : "à vie";
  switch (typeOf(a)) {
    case "item":
      return str(a.material) ? `${amount} × ${a.material}` : "Objet à choisir";
    case "crate-key":
      return str(a.crate) ? `${amount} clé${amount > 1 ? "s" : ""} « ${a.crate} »` : "Caisse à choisir";
    case "rank":
      return str(a.group) ? `Grade ${a.group}, ${duration}` : "Grade à choisir";
    case "permission":
      return str(a.node) ? `${a.node}, ${duration}` : "Permission à choisir";
    case "tag":
      return str(a.tag) ? `Tag ${a.tag}, ${duration}` : "Tag à choisir";
    case "command": {
      const n = Array.isArray(a.commands) ? a.commands.length : 0;
      return n ? `${n} commande${n > 1 ? "s" : ""}` : "Commandes à écrire";
    }
    default:
      return str(a.link) ? `Lien : ${a.link}` : "Description seulement";
  }
}

/** Fenêtre superposée de l'éditeur (Radix Dialog : focus piégé, Échap, retour du focus). */
function Overlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[900] bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content className="atelier fixed left-1/2 top-1/2 z-[901] grid max-h-[86vh] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)_auto] rounded-card border border-line bg-surface text-[.85rem] shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="grid gap-0.5">
              <Dialog.Title className="font-display text-[1rem] font-semibold">{title}</Dialog.Title>
              {description && <Dialog.Description className="text-[.8rem] text-muted">{description}</Dialog.Description>}
            </div>
            <Dialog.Close aria-label="Fermer" className="text-[1.2rem] leading-none text-muted hover:text-text">
              ×
            </Dialog.Close>
          </header>
          <div className="min-h-0 overflow-y-auto p-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Section repliable (comme les blocs « Components » de MIB). */
export function Section({ title, hint, open = false, children }: { title: string; hint?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-field border border-line bg-bg/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="config-chevron text-[.7rem] text-muted transition-transform">
          ▶
        </span>
        {title}
        {hint && <span className="ml-auto truncate text-[.75rem] font-normal text-muted">{hint}</span>}
      </summary>
      <div className="border-t border-line p-3">{children}</div>
    </details>
  );
}

/** Champs d'une section, sans les intertitres de groupe du schéma (la section en tient lieu). */
export function SectionFields({ fields, values, onChange }: { fields: ConfigField[]; values: ConfigValues; onChange: (v: ConfigValues) => void }) {
  return <ConfigFields fields={fields.map((f) => ({ ...f, group: undefined }))} values={values} inEntry onChange={onChange} />;
}

/**
 * « Au clic, le joueur reçoit » : une carte qui résume ce que donne l'article. Cliquer ouvre la liste
 * des possibilités, puis une fenêtre avec seulement les réglages du choix fait.
 */
export function DeliveryCard({
  article,
  fields,
  items,
  onChange,
}: {
  article: ConfigValues;
  fields: ConfigField[];
  items: Items;
  onChange: (a: ConfigValues) => void;
}) {
  const [step, setStep] = useState<"closed" | "list" | "configure">("closed");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<ConfigValues>(article);
  const current = DELIVERIES.find((d) => d.type === typeOf(article)) ?? DELIVERIES[0];
  const chosen = DELIVERIES.find((d) => d.type === typeOf(draft)) ?? DELIVERIES[0];
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? DELIVERIES.filter((d) => `${d.label} ${d.text}`.toLowerCase().includes(q)) : DELIVERIES;
  }, [query]);

  function configure(type: string) {
    const next = { ...(step === "closed" ? article : draft) };
    // « item » est la valeur par défaut du plugin : inutile de l'écrire.
    if (type === "item") delete next.type;
    else next.type = type;
    setDraft(next);
    setStep("configure");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(article);
          setStep("configure");
        }}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-field border border-line bg-bg/40 p-2.5 text-left transition-colors hover:border-accent"
      >
        <McItem material={current.icon} items={items} size={30} />
        <span className="grid min-w-0">
          <span className="font-medium">{current.label}</span>
          <span className="truncate text-[.78rem] text-muted">{summary(article)}</span>
        </span>
        <span className="text-[.78rem] font-medium text-accent-text">Configurer</span>
      </button>
      <button
        type="button"
        onClick={() => {
          setDraft(article);
          setQuery("");
          setStep("list");
        }}
        className="justify-self-start text-[.78rem] text-accent-text hover:underline"
      >
        Changer ce que donne l’article
      </button>

      <Overlay
        open={step === "list"}
        onOpenChange={(o) => !o && setStep("closed")}
        title="Que reçoit le joueur ?"
        description="Choisissez ce que l’article donne à l’achat ; ses réglages s’ouvrent ensuite."
      >
        <div className="grid gap-3">
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher (grade, clé, commande…)"
            aria-label="Chercher un type d’article"
          />
          <ul className="grid gap-1">
            {matches.map((d) => (
              <li key={d.type}>
                <button
                  type="button"
                  onClick={() => configure(d.type)}
                  className={cn(
                    "grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-field px-3 py-2.5 text-left transition-colors hover:bg-surface-2",
                    d.type === current.type && "bg-surface-2 shadow-[inset_2px_0_0_var(--color-accent)]",
                  )}
                >
                  <McItem material={d.icon} items={items} size={28} />
                  <span className="grid gap-0.5">
                    <span className="font-medium">{d.label}</span>
                    <span className="text-[.8rem] text-muted">{d.text}</span>
                  </span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-2 text-muted">Aucun type ne correspond.</li>}
          </ul>
        </div>
      </Overlay>

      <Overlay
        open={step === "configure"}
        onOpenChange={(o) => !o && setStep("closed")}
        title={`Configurer : ${chosen.label}`}
        description={chosen.text}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setStep("list")}>
              Changer de type
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setStep("closed")}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(draft);
                setStep("closed");
              }}
            >
              Appliquer
            </Button>
          </>
        }
      >
        <SectionFields fields={fields.filter((f) => chosen.fields.includes(f.key))} values={draft} onChange={setDraft} />
      </Overlay>
    </>
  );
}
