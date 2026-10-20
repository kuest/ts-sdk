import { createPublicClient } from '@market-sdk/client';
import { never } from './lib/assert';

const client = createPublicClient();

const { items } = await client
  .listMarkets({
    pageSize: 3,
  })
  .firstPage();

const marketBySlug = await client.fetchMarket({
  slug: items[0]?.slug ?? never('No slug found for market'),
});

const marketById = await client.fetchMarket({
  id: items[1]?.id ?? never('No active market found'),
});

console.log(`Slug lookup: ${marketBySlug.question ?? marketBySlug.id}`);
console.log(`ID lookup: ${marketById.question ?? marketById.id}`);
