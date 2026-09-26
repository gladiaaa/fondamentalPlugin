import { defineConfig } from 'vitest/config';

// Tests unitaires : aucun service externe (base, Stripe, serveur de licences) ;
// les dépendances sont remplacées par des doublures.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
