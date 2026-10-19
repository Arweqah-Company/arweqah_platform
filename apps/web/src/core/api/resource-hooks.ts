import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

/**
 * Builds the standard query + mutation hooks for a feature from plain fetch
 * functions, so cache keys and invalidation are written once.
 */
export function createResourceHooks<TList, TQuery = void>(key: string, list: (q: TQuery) => Promise<TList>) {
  const listKey = (q?: TQuery): QueryKey => (q === undefined ? [key] : [key, q]);
  return {
    key,
    useList: (q: TQuery) => useQuery({ queryKey: listKey(q), queryFn: () => list(q) }),
    useMutate: <TInput, TOut>(fn: (input: TInput) => Promise<TOut>) => {
      const client = useQueryClient();
      return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: [key] }) });
    },
  };
}
