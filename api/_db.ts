import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface QueryLogItem {
  query: string;
  params: string;
  duration: number;
}

export const queryStorage = new AsyncLocalStorage<QueryLogItem[]>();

export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
  ],
});

prisma.$on('query' as any, (e: any) => {
  const store = queryStorage.getStore();
  if (store) {
    store.push({
      query: e.query,
      params: e.params,
      duration: e.duration,
    });
  }
});
