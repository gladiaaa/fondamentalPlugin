"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { AdminProductResponse } from "@fondamental/shared";
import { getAdminProducts, updateProduct } from "@/lib/api/admin";
import { useSession } from "@/lib/session/SessionContext";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { adminErrorMessage, useAdminData } from "@/features/admin/useAdminData";

/** `"9,99"` ou `"9.99"` -> 999 ; `null` si la saisie n'est pas un prix. */
function parsePrice(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function ProductForm({ product, onSaved }: { product: AdminProductResponse; onSaved: (p: AdminProductResponse) => void }) {
  const { csrfToken } = useSession();
  const [price, setPrice] = useState(product.priceCents === null ? "" : (product.priceCents / 100).toFixed(2).replace(".", ","));
  const [stripePriceId, setStripePriceId] = useState(product.stripePriceId ?? "");
  const [description, setDescription] = useState(product.description);
  const [active, setActive] = useState(product.active);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const priceCents = price.trim() === "" ? null : parsePrice(price);
  const priceInvalid = price.trim() !== "" && priceCents === null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || priceInvalid) return;
    setError(null);
    setSaving(true);
    try {
      const patch: Parameters<typeof updateProduct>[1] = { description, active };
      if (priceCents !== null) patch.priceCents = priceCents;
      if (stripePriceId.trim()) patch.stripePriceId = stripePriceId.trim();
      const saved = await updateProduct(product.slug, patch, csrfToken);
      onSaved(saved);
      toast.success(`${product.name} enregistré.`);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-card-lg border border-line bg-surface p-5" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[1.1rem] font-semibold">{product.name}</h2>
        <Badge variant={product.active ? "success" : "neutral"}>{product.active ? "En vente" : "Retiré de la vente"}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prix (€)" htmlFor={`price-${product.slug}`} error={priceInvalid ? "Prix invalide (ex. 9,99)." : undefined}>
          <Input id={`price-${product.slug}`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field
          label="Identifiant de prix Stripe"
          htmlFor={`stripe-${product.slug}`}
          hint="price_… du mode (test ou live) de cet environnement. Le prix affiché doit correspondre."
        >
          <Input id={`stripe-${product.slug}`} value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} spellCheck={false} />
        </Field>
      </div>
      <Field label="Description" htmlFor={`desc-${product.slug}`}>
        <Textarea id={`desc-${product.slug}`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Switch label="En vente sur le site" checked={active} onCheckedChange={setActive} />
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <Button type="submit" loading={saving} disabled={priceInvalid}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export default function AdminProductsPage() {
  const { data: products, error, setData } = useAdminData(getAdminProducts);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Produits"
        description="Le prix affiché et l'identifiant de prix Stripe doivent correspondre : c'est Stripe qui encaisse le montant de son prix."
      />
      {error && <Alert variant="error">{error}</Alert>}
      {!products && !error && <Skeleton className="h-64" />}
      {products?.map((product) => (
        <ProductForm
          key={product.slug}
          product={product}
          onSaved={(saved) => setData(products.map((p) => (p.slug === saved.slug ? saved : p)))}
        />
      ))}
    </div>
  );
}
