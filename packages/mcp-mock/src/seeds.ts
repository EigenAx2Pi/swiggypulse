import type { Restaurant, RestaurantMenu, Coupon, Address, DineoutRestaurant, InstamartProduct } from './types.js';

export const RESTAURANT: Restaurant = {
  id: 'rest_bh_001',
  name: 'Biryani House - Koramangala',
  cuisines: ['Biryani', 'North Indian', 'Mughlai'],
  rating: 4.3,
  ratingCount: 1247,
  deliveryTime: '30-35 MIN',
  deliveryTimeSpoken: 'about 30 minutes',
  costForTwo: 450,
  availabilityStatus: 'OPEN',
  distance: 2.1,
  locality: 'Koramangala, Bangalore',
  hasWidgets: true,
};

export const MENU: RestaurantMenu = {
  restaurantId: 'rest_bh_001',
  categories: [
    {
      name: 'Bestsellers',
      items: [
        {
          id: 'item_001',
          name: 'Chicken Biryani',
          description: 'Fragrant basmati rice with tender chicken pieces, slow-cooked with aromatic spices',
          price: 349,
          isVeg: false,
          isBestseller: true,
          rating: 4.5,
          ratingCount: 892,
          variants: [
            { id: 'var_001a', name: 'Regular', price: 349 },
            { id: 'var_001b', name: 'Family Pack', price: 649 },
          ],
          addOns: [
            { id: 'addon_001', name: 'Extra Raita', price: 49 },
            { id: 'addon_002', name: 'Salan', price: 39 },
          ],
          category: 'Bestsellers',
          marginPct: 0.32,
        },
        {
          id: 'item_002',
          name: 'Mutton Biryani',
          description: 'Slow-cooked mutton biryani with tender meat falling off the bone',
          price: 449,
          isVeg: false,
          isBestseller: true,
          rating: 4.4,
          ratingCount: 654,
          category: 'Bestsellers',
          marginPct: 0.41,
        },
        {
          id: 'item_005',
          name: 'Butter Chicken',
          description: 'Tender chicken in a rich, creamy tomato-based gravy',
          price: 329,
          isVeg: false,
          isBestseller: true,
          rating: 4.3,
          ratingCount: 567,
          category: 'Bestsellers',
          marginPct: 0.36,
        },
      ],
    },
    {
      name: 'Vegetarian',
      items: [
        {
          id: 'item_003',
          name: 'Veg Biryani',
          description: 'Aromatic basmati rice with mixed vegetables and saffron',
          price: 249,
          isVeg: true,
          isBestseller: false,
          rating: 4.0,
          ratingCount: 312,
          category: 'Vegetarian',
          marginPct: 0.45,
        },
        {
          id: 'item_004',
          name: 'Paneer Tikka',
          description: 'Cottage cheese cubes marinated in spices, grilled in a tandoor',
          price: 279,
          isVeg: true,
          isBestseller: false,
          rating: 4.2,
          ratingCount: 198,
          category: 'Vegetarian',
          marginPct: 0.42,
        },
      ],
    },
    {
      name: 'Desserts',
      items: [
        {
          id: 'item_006',
          name: 'Gulab Jamun (2 pcs)',
          description: 'Soft milk dumplings in cardamom-infused sugar syrup',
          price: 99,
          isVeg: true,
          isBestseller: false,
          rating: 4.1,
          ratingCount: 234,
          category: 'Desserts',
          marginPct: 0.55,
        },
      ],
    },
  ],
};

export const COUPONS: Coupon[] = [
  {
    code: 'WELCOME20',
    title: '20% off up to ₹100',
    description: 'Valid on orders above ₹199',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxDiscount: 100,
    minOrderValue: 199,
    requiresOnlinePayment: false,
    isApplicable: true,
    expiresAt: '2026-05-30T23:59:59+05:30',
  },
  {
    code: 'SWIGGYIT',
    title: 'Flat ₹125 off',
    description: 'Valid on orders above ₹299 via online payment',
    discountType: 'FLAT',
    discountValue: 125,
    minOrderValue: 299,
    requiresOnlinePayment: true,
    isApplicable: false,
  },
  {
    code: 'BIRYANI50',
    title: '50% off on Biryani',
    description: 'Max ₹75 off on Biryani category',
    discountType: 'PERCENTAGE',
    discountValue: 50,
    maxDiscount: 75,
    minOrderValue: 149,
    requiresOnlinePayment: false,
    isApplicable: true,
  },
];

export const ADDRESSES: Address[] = [
  {
    id: 'addr_home_01',
    label: 'Home',
    displayText: '123, 4th Cross, Koramangala 5th Block, Bangalore 560095',
    type: 'HOME',
  },
  {
    id: 'addr_work_01',
    label: 'Work',
    displayText: 'WeWork Galaxy, Residency Road, Bangalore 560025',
    type: 'WORK',
  },
];

export const DINEOUT: DineoutRestaurant = {
  restaurantId: 'rest_bh_001_dineout',
  name: 'Biryani House - Koramangala',
  dineoutRating: 4.1,
  costForTwo: 600,
  availability: 'AVAILABLE',
  highlights: ['AC', 'Parking', 'Family Friendly'],
  offers: [{ title: '20% off total bill via Dineout', type: 'FLAT_DISCOUNT' }],
  slots: {
    lunch: ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM'],
    dinner: ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'],
  },
  weeklyCovers: {
    mon: 23, tue: 28, wed: 31, thu: 35, fri: 52, sat: 67, sun: 58,
  },
};

export const INSTAMART_PRODUCTS: InstamartProduct[] = [
  { id: 'im_001', name: 'Basmati Rice 1kg', category: 'Grocery', price: 189, unit: '1 kg', inStock: true },
  { id: 'im_002', name: 'Fresh Mint Leaves', category: 'Vegetables', price: 29, unit: '100 g', inStock: true },
  { id: 'im_003', name: 'Coriander Bunch', category: 'Vegetables', price: 19, unit: '1 bunch', inStock: true },
  { id: 'im_004', name: 'Ginger-Garlic Paste', category: 'Pantry', price: 65, unit: '200 g', inStock: true },
  { id: 'im_005', name: 'Curd 500ml', category: 'Dairy', price: 45, unit: '500 ml', inStock: true },
  { id: 'im_006', name: 'Lemons (4 pcs)', category: 'Vegetables', price: 25, unit: '4 pcs', inStock: false },
  { id: 'im_007', name: 'Saffron 1g', category: 'Pantry', price: 199, unit: '1 g', inStock: true },
  { id: 'im_008', name: 'Whole Garam Masala 50g', category: 'Pantry', price: 89, unit: '50 g', inStock: true },
];
