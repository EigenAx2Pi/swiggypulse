export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  deliveryTime: string;
  costForTwo: number;
  locality: string;
}

export interface PeriodMetrics {
  orders: number;
  revenue: number;
  aov: number;
  cancellationRate: number;
  avgDeliveryTimeMinutes: number;
}

export interface RestaurantMetrics {
  total: PeriodMetrics & {
    last7d: PeriodMetrics;
    last30d: PeriodMetrics;
    last90d: PeriodMetrics;
  };
  peakHours: { hour: number; orders: number }[];
  hourlyHeatmap: { dow: number; hour: number; orders: number }[];
  dailySeries: { date: string; orders: number; revenue: number; isRainy: boolean }[];
  repeatCustomerRate: number;
  couponUtilizationRate: number;
}

export interface ItemMetric {
  itemId: string;
  name: string;
  category: string;
  isVeg: boolean;
  unitsSold: number;
  revenue: number;
  avgRating: number;
  trendPct: number;
  marginPct: number;
  estimatedMargin: number;
}

export interface Coupon {
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  requiresOnlinePayment: boolean;
  isApplicable: boolean;
}

export interface CouponPerformance {
  code: string;
  redemptions: number;
  avgOrderValueWithCoupon: number;
  avgOrderValueOverall: number;
  estimatedIncrementalOrders: number;
  estimatedDiscountCost: number;
  roi: number;
}

export interface WeatherDay {
  date: string;
  temp: number;
  humidity: number;
  condition: string;
  rainProbability: number;
  isRainy: boolean;
}

export interface WeatherImpact {
  correlationCoeff: number;
  rainyDayAvgOrders: number;
  clearDayAvgOrders: number;
  sensitiveItems: { itemId: string; name: string; rainMultiplier: number }[];
}

export interface DineoutData {
  restaurantId: string;
  name: string;
  dineoutRating: number;
  costForTwo: number;
  highlights: string[];
  weeklyCovers: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
}

export interface DayOfWeekMetric {
  dow: number;
  label: string;
  orders: number;
  revenue: number;
}

export interface Recommendation {
  id: string;
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  insight: string;
  action: string;
  estimatedImpact: string;
  estimatedRevenue: string;
  dataPoints: string[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg: boolean;
  isBestseller: boolean;
  rating: number;
  ratingCount: number;
}

export interface RestaurantMenu {
  restaurantId: string;
  categories: { name: string; items: MenuItem[] }[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  source?: 'claude' | 'precanned';
}
