import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { withBase } from '../lib/url';
import { SITE } from '../consts';
import { locale } from '../i18n';

export async function GET(context: APIContext) {
  const posts = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );

  return rss({
    title: SITE.title,
    description: SITE.rssDescription,
    site: context.site ?? 'https://example.com',
    customData: `<language>${locale}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      link: withBase(`/writing/${post.id}/`),
      categories: post.data.tags,
    })),
  });
}
