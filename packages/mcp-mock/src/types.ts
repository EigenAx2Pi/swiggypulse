export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  deliveryTime: string;
  deliveryTimeSpoken: string;
  costForTwo: number;
  availabilityStatus: 'OPEN' | 'CLOSED';
  distance: number;
  locality: string;
  hasWidgets: boolean;
}

export interface MenuVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuAddOn {
  id: string;
  name: string;
  price: number;
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
  variants?: MenuVariant[];
  addOns?: MenuAddOn[];
  category: string;
  marginPct: number;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface RestaurantMenu {
  restaurantId: string;
  categories: MenuCategory[];
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'DELIVERED' | 'CANCELLED_BY_CUSTOMER' | 'CANCELLED_BY_RESTAURANT';
export type PaymentMethod = 'COD' | 'UPI' | 'CARD' | 'WALLET';

export interface Order {
  orderId: string;
  restaurantId: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  deliveredAt: string | null;
  deliveryTimeMinutes: number | null;
  paymentMethod: PaymentMethod;
  couponApplied: string | null;
  rating: number | null;
  cancellationReason: string | null;
}

export type CouponDiscountType = 'PERCENTAGE' | 'FLAT';

export interface Coupon {
  code: string;
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  requiresOnlinePayment: boolean;
  isApplicable: boolean;
  expiresAt?: string;
}

export interface Address {
  id: string;
  label: string;
  displayText: string;
  type: 'HOME' | 'WORK' | 'OTHER';
}

export interface WeatherDay {
  date: string;
  temp: number;
  humidity: number;
  condition: 'Clear' | 'Clouds' | 'Rain' | 'Thunderstorm' | 'Mist';
  rainProbability: number;
  isRainy: boolean;
}

export interface InstamartProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  inStock: boolean;
  imageUrl?: string;
}

export interface DineoutSlots {
  lunch: string[];
  dinner: string[];
}

export interface WeeklyCovers {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface DineoutRestaurant {
  restaurantId: string;
  name: string;
  dineoutRating: number;
  costForTwo: number;
  availability: 'AVAILABLE' | 'WAITLIST' | 'CLOSED';
  highlights: string[];
  offers: { title: string; type: string }[];
  slots: DineoutSlots;
  weeklyCovers: WeeklyCovers;
}

export interface MCPResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}
