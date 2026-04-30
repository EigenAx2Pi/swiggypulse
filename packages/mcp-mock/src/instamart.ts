import { INSTAMART_PRODUCTS } from './seeds.js';
import type { MCPResponse } from './types.js';

export const instamartTools = {
  search_products: async (args?: { query?: string }): Promise<MCPResponse> => {
    const query = args?.query?.toLowerCase();
    const results = !query
      ? INSTAMART_PRODUCTS
      : INSTAMART_PRODUCTS.filter(
          (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
        );
    return { success: true, data: { products: results } };
  },

  your_go_to_items: async (): Promise<MCPResponse> => ({
    success: true,
    data: {
      products: INSTAMART_PRODUCTS.filter((p) =>
        ['im_001', 'im_004', 'im_005', 'im_008'].includes(p.id),
      ),
    },
  }),
};
