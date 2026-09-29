import type { MDXComponents } from "mdx/types";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

/** Pastille « Premium » dans le texte : fonction réservée à l'édition Premium du plugin. */
function Premium() {
  return (
    <span className="ml-1 inline-block rounded-full bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] px-2 py-0.5 align-middle font-mono text-[.68rem] font-semibold uppercase tracking-[.06em] text-accent-text">
      Premium
    </span>
  );
}

/** Composants disponibles dans les pages MDX du wiki (content/docs). */
export const wikiMdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  Callout,
  Card,
  Cards,
  Step,
  Steps,
  Tab,
  Tabs,
  Premium,
};
