import { getCollection, type CollectionEntry } from 'astro:content';

export type BrokerEntry = CollectionEntry<'plataformas'>;

export async function getAllBrokers() {
  const entries = await getCollection('plataformas');
  return entries.map(e => ({
    slug: e.slug,
    ...e.data,
  }));
}

// Pequena ajuda para apanhar várias por slug
export async function getBrokersBySlugs(slugs: string[]) {
  const all = await getAllBrokers();
  const set = new Set(slugs.map(s => s.toLowerCase()));
  return all.filter(b => set.has(b.slug.toLowerCase()));
}
