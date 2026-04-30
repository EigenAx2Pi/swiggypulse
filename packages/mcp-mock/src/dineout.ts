import { DINEOUT } from './seeds.js';
import type { MCPResponse } from './types.js';

export const dineoutTools = {
  search_restaurants_dineout: async (): Promise<MCPResponse> => ({
    success: true,
    data: { restaurants: [DINEOUT] },
  }),

  get_restaurant_details: async (args?: { restaurantId?: string }): Promise<MCPResponse> => {
    if (args?.restaurantId && args.restaurantId !== DINEOUT.restaurantId) {
      return { success: false, data: null, message: 'Restaurant not found' };
    }
    return { success: true, data: DINEOUT };
  },

  get_available_slots: async (args?: { restaurantId?: string; date?: string }): Promise<MCPResponse> => {
    if (args?.restaurantId && args.restaurantId !== DINEOUT.restaurantId) {
      return { success: false, data: null, message: 'Restaurant not found' };
    }
    return { success: true, data: { slots: DINEOUT.slots, date: args?.date ?? new Date().toISOString().slice(0, 10) } };
  },
};
