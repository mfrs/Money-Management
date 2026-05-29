import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface QueryLogItem {
  query: string;
  params: string;
  duration: number;
}

export const queryStorage = new AsyncLocalStorage<QueryLogItem[]>();

const prismaRaw = new PrismaClient();

// Prisma Client Extension maintains Node's async context (AsyncLocalStorage)
export const prisma = prismaRaw.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = queryStorage.getStore();
        if (!store) {
          return query(args);
        }

        const start = performance.now();
        try {
          const result = await query(args);
          const duration = performance.now() - start;
          
          const modelVar = model.charAt(0).toLowerCase() + model.slice(1);
          const queryText = `await prisma.${modelVar}.${operation}(...)`;
          const paramsJSON = args ? JSON.stringify(args, null, 2) : '';

          store.push({
            query: queryText,
            params: paramsJSON,
            duration: parseFloat(duration.toFixed(2)),
          });
          return result;
        } catch (err: any) {
          const duration = performance.now() - start;
          const modelVar = model.charAt(0).toLowerCase() + model.slice(1);
          const queryText = `[ERROR] await prisma.${modelVar}.${operation}(...)`;
          const paramsJSON = args ? JSON.stringify(args, null, 2) : '';

          store.push({
            query: queryText,
            params: `${paramsJSON}\n\nError: ${err.message}`,
            duration: parseFloat(duration.toFixed(2)),
          });
          throw err;
        }
      },
    },
  },
});
