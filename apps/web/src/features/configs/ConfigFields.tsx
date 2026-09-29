"use client";

import { useId, useState } from "react";
import type { ConfigField, ConfigListField, ConfigMapField, ConfigValue, ConfigValues } from "@fondamental/shared";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isShown, isValues, matchingOption, optionDefault, withKey } from "./values";

/**
 * Formulaire généré depuis le schéma d'un fichier (#30) : un composant par sorte de champ
 * (`ConfigField` dans @fondamental/shared). Les valeurs ont la forme du YAML ; un champ vide
 * d'une entrée (crate, tag, quête…) est retiré, pour ne pas écrire de clé inutile.
 */
export function ConfigFields({
  fields,
  values,
  onChange,
  inEntry = false,
}: {
  fields: ConfigField[];
  values: ConfigValues;
  onChange: (values: ConfigValues) => void;
  /** Dans une entrée nommée ou un élément de liste : un texte vidé retire la clé. */
  inEntry?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {fields
        .filter((field) => isShown(field, values))
        .map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={values[field.key]}
            inEntry={inEntry}
            onChange={(value) => onChange(withKey(values, field.key, value))}
          />
        ))}
    </div>
  );
}

function PremiumBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] px-1.5 py-0.5 align-middle font-mono text-[.62rem] font-semibold uppercase tracking-[.06em] text-accent-text">
      Premium
    </span>
  );
}

function Label({ field }: { field: ConfigField }) {
  return (
    <>
      {field.label}
      {field.premium && <PremiumBadge />}
    </>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  inEntry,
}: {
  field: ConfigField;
  value: ConfigValue | undefined;
  onChange: (value: ConfigValue | undefined) => void;
  inEntry: boolean;
}) {
  const id = useId();

  switch (field.kind) {
    case "license":
      return (
        <div className="grid gap-1.5 rounded-field border border-dashed border-line px-4 py-3 text-[.88rem]">
          <span className="font-medium">{field.label}</span>
          <span className="text-muted">Remplie automatiquement avec votre clé de licence dans le fichier téléchargé.</span>
        </div>
      );

    case "text":
      return (
        <FieldShell field={field} id={id}>
          {field.multiline ? (
            <Textarea
              id={id}
              value={typeof value === "string" ? value : ""}
              placeholder={field.placeholder}
              onChange={(e) => onChange(e.target.value === "" && inEntry ? undefined : e.target.value)}
            />
          ) : (
            <Input
              id={id}
              value={typeof value === "string" ? value : ""}
              placeholder={field.placeholder}
              pattern={field.pattern}
              maxLength={field.maxLength}
              className={field.minimessage ? "font-mono text-[.85rem]" : undefined}
              onChange={(e) => onChange(e.target.value === "" && inEntry ? undefined : e.target.value)}
            />
          )}
        </FieldShell>
      );

    case "number":
      return (
        <FieldShell field={field} id={id}>
          <Input
            id={id}
            type="number"
            inputMode={field.integer ? "numeric" : "decimal"}
            min={field.min}
            max={field.max}
            step={field.step ?? (field.integer ? 1 : "any")}
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </FieldShell>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[.9rem]">
            <Label field={field} />
            {field.help && <small className="block text-[.8rem] text-muted">{field.help}</small>}
          </span>
          <Switch label={field.label} checked={value === true} onCheckedChange={(checked) => onChange(checked)} />
        </div>
      );

    case "select":
      return (
        <FieldShell field={field} id={id}>
          <Select
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          >
            <option value="">{inEntry ? "— (valeur par défaut)" : "—"}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.premium ? " · Premium" : ""}
              </option>
            ))}
          </Select>
        </FieldShell>
      );

    case "textList":
      return (
        <FieldShell field={field} id={id} hintSuffix="Un élément par ligne.">
          <Textarea
            id={id}
            className={cn("min-h-[84px]", field.minimessage && "font-mono text-[.85rem]")}
            value={Array.isArray(value) ? (value as string[]).join("\n") : ""}
            onChange={(e) => {
              const items = e.target.value.split("\n");
              onChange(e.target.value === "" ? (inEntry ? undefined : []) : items);
            }}
          />
        </FieldShell>
      );

    case "section":
      return (
        <Group title={<Label field={field} />} help={field.help} defaultOpen={!inEntry}>
          <ConfigFields
            fields={field.fields}
            values={isValues(value) ? value : {}}
            onChange={(next) => onChange(next)}
            inEntry={inEntry}
          />
        </Group>
      );

    case "map":
      return <MapEditor field={field} value={isValues(value) ? value : {}} onChange={onChange} />;

    case "list":
      return <ListEditor field={field} value={Array.isArray(value) ? (value as ConfigValues[]) : []} onChange={onChange} />;

    case "oneOf": {
      const current = matchingOption(field, value);
      const option = field.options[current];
      return (
        <div className="grid gap-2">
          <FieldShell field={field} id={id}>
            <Select
              id={id}
              value={current}
              onChange={(e) => onChange(optionDefault(field.options[Number(e.target.value)].field))}
            >
              {field.options.map((o, i) => (
                <option key={o.label} value={i}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FieldShell>
          {option && option.field.kind !== "select" && (
            <FieldEditor field={{ ...option.field, key: field.key, label: option.label }} value={value} onChange={onChange} inEntry />
          )}
        </div>
      );
    }
  }
}

function FieldShell({
  field,
  id,
  hintSuffix,
  children,
}: {
  field: ConfigField;
  id: string;
  hintSuffix?: string;
  children: React.ReactNode;
}) {
  const hint = [field.help, hintSuffix].filter(Boolean).join(" ");
  return (
    <Field label={field.label} htmlFor={id} hint={hint || undefined} optionalHint={field.premium ? "· Premium" : undefined}>
      {children}
    </Field>
  );
}

function Group({
  title,
  help,
  defaultOpen,
  actions,
  children,
}: {
  title: React.ReactNode;
  help?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="rounded-card border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 font-medium sm:px-4 sm:py-3">
        <span className="flex items-center gap-2">
          {/* Tourne avec SON bloc seulement (pas avec un bloc parent ouvert) : voir globals.css. */}
          <span aria-hidden className="config-chevron text-muted transition-[rotate]">▸</span>
          {title}
        </span>
        {actions}
      </summary>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-line px-3 py-3 sm:px-4 sm:py-4">
        {help && <p className="text-[.85rem] text-muted">{help}</p>}
        {children}
      </div>
    </details>
  );
}

function MapEditor({
  field,
  value,
  onChange,
}: {
  field: ConfigMapField;
  value: ConfigValues;
  onChange: (value: ConfigValues) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const newId = useId();
  const pattern = new RegExp(field.keyPattern);
  const keyValid = newKey !== "" && pattern.test(newKey) && !(newKey in value);
  const entries = Object.entries(value);

  function add() {
    if (!keyValid) return;
    const initial = field.value ? optionDefault(field.value) : {};
    onChange({ ...value, [newKey]: initial });
    setNewKey("");
  }

  return (
    <Group
      title={
        <>
          <Label field={field} /> <span className="text-[.8rem] font-normal text-muted">({entries.length})</span>
        </>
      }
      help={field.help}
    >
      {entries.length === 0 && <p className="text-[.85rem] text-muted">Aucun(e) {field.itemLabel} pour l’instant.</p>}
      {entries.map(([key, entry]) =>
        field.value ? (
          <div key={key} className="flex items-end gap-2">
            <FieldEditor
              field={{ ...field.value, key, label: key }}
              value={entry}
              onChange={(v) => onChange(withKey(value, key, v))}
              inEntry
            />
            <Button size="sm" variant="secondary" onClick={() => onChange(withKey(value, key, undefined))}>
              Retirer
            </Button>
          </div>
        ) : (
          <Group
            key={key}
            title={<span className="font-mono text-[.9rem]">{key}</span>}
            actions={
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  onChange(withKey(value, key, undefined));
                }}
              >
                Retirer
              </Button>
            }
          >
            <ConfigFields
              fields={field.fields ?? []}
              values={isValues(entry) ? entry : {}}
              onChange={(next) => onChange(withKey(value, key, next))}
              inEntry
            />
          </Group>
        ),
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Field
          label={`Identifiant (${field.itemLabel} à ajouter)`}
          htmlFor={newId}
          hint={field.keyHelp ?? "Identifiant : lettres, chiffres, _ et -."}
          error={newKey !== "" && !keyValid ? (newKey in value ? "Existe déjà." : "Identifiant invalide.") : undefined}
          className="min-w-[200px] flex-1"
        >
          <Input
            id={newId}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </Field>
        <Button variant="secondary" disabled={!keyValid} onClick={add}>
          Ajouter
        </Button>
      </div>
    </Group>
  );
}

function ListEditor({
  field,
  value,
  onChange,
}: {
  field: ConfigListField;
  value: ConfigValues[];
  onChange: (value: ConfigValues[]) => void;
}) {
  const variants = field.variants;
  const typeId = useId();
  const [newType, setNewType] = useState(variants?.options[0]?.value ?? "");

  const replace = (index: number, item: ConfigValues | undefined) =>
    onChange(item === undefined ? value.filter((_, i) => i !== index) : value.map((v, i) => (i === index ? item : v)));

  return (
    <Group
      title={
        <>
          <Label field={field} /> <span className="text-[.8rem] font-normal text-muted">({value.length})</span>
        </>
      }
      help={field.help}
      defaultOpen={value.length > 0 && value.length <= 3}
    >
      {value.map((item, index) => {
        const option = variants?.options.find((o) => o.value === item[variants.key]);
        const fields = variants ? (option?.fields ?? []) : (field.fields ?? []);
        return (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-field border border-line bg-surface-2 p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[.88rem] font-medium">
                {option ? option.label : `${field.itemLabel} ${index + 1}`}
                {option?.premium && <PremiumBadge />}
              </span>
              <Button size="sm" variant="secondary" onClick={() => replace(index, undefined)}>
                Retirer
              </Button>
            </div>
            <ConfigFields
              fields={fields}
              values={item}
              onChange={(next) => replace(index, variants ? { [variants.key]: item[variants.key], ...next } : next)}
              inEntry
            />
          </div>
        );
      })}
      <div className="flex flex-wrap items-end gap-2">
        {variants && (
          <Field label={`Type (${field.itemLabel} à ajouter)`} htmlFor={typeId} className="min-w-[200px] flex-1">
            <Select id={typeId} value={newType} onChange={(e) => setNewType(e.target.value)}>
              {variants.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {o.premium ? " · Premium" : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            onChange([...value, variants ? { [variants.key]: newType } : {}]);
          }}
        >
          Ajouter
        </Button>
      </div>
    </Group>
  );
}
