import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';
import { SITE } from '../../../consts';

// Build-time generated Open Graph images for every writing post and work entry,
// rendered in the theme's light palette (see global.css tokens). The static
// `public/og.jpg` remains the site-wide fallback for all other pages.

interface OgProps {
  title: string;
  description: string;
  kind: string;
}

export const getStaticPaths = (async () => {
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const work = await getCollection('work');
  return [
    ...writing.map((entry) => ({
      params: { collection: 'writing', slug: entry.id },
      props: {
        title: entry.data.title,
        description: entry.data.description,
        kind: 'Writing',
      } satisfies OgProps,
    })),
    ...work.map((entry) => ({
      params: { collection: 'work', slug: entry.id },
      props: {
        title: entry.data.title,
        description: entry.data.description,
        kind: 'Work',
      } satisfies OgProps,
    })),
  ];
}) satisfies GetStaticPaths;

// Satori has no oklch() support, so these are hex equivalents of the
// light-theme tokens in global.css.
const COLOR = {
  bg: '#fcfcfa',
  text: '#252831',
  muted: '#697080',
  line: '#dbd8d0',
  accent: '#a8492c',
};

const require = createRequire(import.meta.url);
const font = (pkgPath: string) => readFile(require.resolve(pkgPath));

// Keep the Latin subsets for the established visual identity, and load the
// Korean subset locally so non-Latin titles never depend on build-time network
// access. Satori only supports WOFF/TTF/OTF (not WOFF2), hence the explicit
// `.woff` path here.
const [fraunces, publicSans, notoSansKr] = await Promise.all([
  font('@fontsource/fraunces/files/fraunces-latin-600-normal.woff'),
  font('@fontsource/public-sans/files/public-sans-latin-400-normal.woff'),
  font('@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff'),
]);

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export const GET: APIRoute<OgProps> = async ({ props }) => {
  const { title, description, kind } = props;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: COLOR.bg,
          padding: 40,
          fontFamily: 'Public Sans, Noto Sans KR',
        },
        children: {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: `1px solid ${COLOR.line}`,
              padding: '52px 60px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 16 },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          width: 22,
                          height: 22,
                          backgroundColor: COLOR.accent,
                        },
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Fraunces, Noto Sans KR',
                          fontSize: 30,
                          color: COLOR.text,
                        },
                        children: SITE.title,
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          marginBottom: 28,
                          color: COLOR.accent,
                          fontFamily: 'Fraunces, Noto Sans KR',
                          fontSize: 24,
                          textTransform: 'uppercase',
                          letterSpacing: 4,
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                width: 40,
                                height: 1,
                                backgroundColor: COLOR.accent,
                              },
                            },
                          },
                          { type: 'div', props: { children: kind } },
                        ],
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Fraunces, Noto Sans KR',
                          fontSize: title.length > 55 ? 54 : 64,
                          lineHeight: 1.15,
                          color: COLOR.text,
                        },
                        children: truncate(title, 90),
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 26,
                    lineHeight: 1.4,
                    color: COLOR.muted,
                  },
                  children: truncate(description, 120),
                },
              },
            ],
          },
        },
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Fraunces', data: fraunces, weight: 600, style: 'normal' },
        { name: 'Public Sans', data: publicSans, weight: 400, style: 'normal' },
        { name: 'Noto Sans KR', data: notoSansKr, weight: 400, style: 'normal' },
      ],
    },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
