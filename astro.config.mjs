// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers';
import { remarkReadingTime } from './remark-reading-time.mjs';

// https://astro.build/config
export default defineConfig({
  // Vercel provides the production URL through SITE_URL. Set it to the final
  // custom domain in the project environment so canonical and feed URLs match.
  site: process.env.SITE_URL ?? 'https://dohkim-dev.vercel.app',
  integrations: [mdx(), sitemap()],
  vite: {
    optimizeDeps: {
      include: ['mermaid'],
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkReadingTime],
    }),
    // Dual Shiki themes; `defaultColor: false` emits CSS variables
    // (--shiki-light / --shiki-dark) so global.css can switch with the theme.
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      // Preserve indentation and let the code block's own overflow handling
      // provide horizontal scrolling for long source lines.
      wrap: false,
      transformers: [transformerNotationHighlight(), transformerNotationDiff()],
    },
  },
});
