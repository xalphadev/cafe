"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import type { ProductWithCategory } from "@/types";

export function useFavorites() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ ids: string[]; products: ProductWithCategory[] }>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites?full=true");
      if (!res.ok) return { ids: [], products: [] };
      const json = await res.json();
      return json.data ?? { ids: [], products: [] };
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const favoriteIds = new Set(data?.ids ?? []);
  const favoriteProducts: ProductWithCategory[] = data?.products ?? [];

  const { mutate: toggle } = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      return res.json();
    },
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: ["favorites"] });
      const prev = qc.getQueryData<{ ids: string[]; products: ProductWithCategory[] }>(["favorites"]);
      qc.setQueryData<{ ids: string[]; products: ProductWithCategory[] }>(["favorites"], (old) => {
        const ids = old?.ids ?? [];
        const products = old?.products ?? [];
        if (ids.includes(productId)) {
          return { ids: ids.filter((id) => id !== productId), products: products.filter((p) => p.id !== productId) };
        }
        return { ids: [...ids, productId], products };
      });
      return { prev };
    },
    onError: (_err, _productId, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorites"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return { favoriteIds, favoriteProducts, toggle, isLoggedIn: !!user, isLoading };
}
