import { Skeleton } from "@/components/ui/Skeleton";

/** Affiché pendant `getProducts()` (Next.js prend ce fichier automatiquement comme limite de Suspense). */
export default function Loading() {
  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[1120px] gap-8">
        <div className="grid gap-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-full max-w-[56ch]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid gap-3 rounded-card-lg border border-line bg-surface p-[22px]">
              <Skeleton className="size-[52px] rounded-field" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-2 h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
