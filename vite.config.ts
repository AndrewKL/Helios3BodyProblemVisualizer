import { defineConfig } from 'vite';

// BASE must match where the site is served: /<repo>/ for a GitHub Pages
// project site (www.andrewklong.com/Helios3BodyProblemVisualizer/), / locally.
export default defineConfig({
  base: process.env.BASE ?? '/',
});
