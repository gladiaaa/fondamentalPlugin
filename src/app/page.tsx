const plugins = ["FondamentalBedwars", "FondamentalTag", "FondamentalCrate"];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 rounded-full border border-white/10 px-4 py-1 text-sm text-zinc-400">
        Site en construction
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Fondamental Plugin
      </h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        Des plugins Minecraft premium pour votre serveur. La boutique ouvre très bientôt.
      </p>
      <ul className="mt-10 flex flex-wrap justify-center gap-3">
        {plugins.map((name) => (
          <li
            key={name}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300"
          >
            {name}
          </li>
        ))}
      </ul>
    </main>
  );
}
