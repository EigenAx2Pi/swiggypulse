import { foodTools } from './food.js';
import { instamartTools } from './instamart.js';
import { dineoutTools } from './dineout.js';

export * from './types.js';
export { foodTools } from './food.js';
export { instamartTools } from './instamart.js';
export { dineoutTools } from './dineout.js';
export { getMockWeather } from './weather.js';
export { RESTAURANT, MENU, COUPONS, DINEOUT, ADDRESSES, INSTAMART_PRODUCTS } from './seeds.js';

const TOOLS = {
  ...foodTools,
  ...instamartTools,
  ...dineoutTools,
} as const;

export type MockToolName = keyof typeof TOOLS;

export class MockMCPClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async callTool(name: string, args?: Record<string, any>) {
    const fn = (TOOLS as Record<string, (args?: Record<string, unknown>) => Promise<unknown>>)[name];
    if (!fn) {
      return { success: false, data: null, message: `Unknown tool: ${name}` };
    }
    return fn(args);
  }
}
