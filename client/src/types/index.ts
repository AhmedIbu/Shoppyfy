export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount?: number;
}

export type ProductCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  comparePrice: string | number | null;
  images: string[];
  sizes: string[];
  colors: string[];
  brand: string | null;
  condition: ProductCondition;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  category: Category;
  seller: { id: string; firstName: string; lastName: string };
  avgRating?: number;
  reviewCount?: number;
  reviews?: Review[];
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; avatarUrl: string | null };
}

export interface CartItem {
  id: string;
  quantity: number;
  size: string | null;
  color: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string | number;
    comparePrice: string | number | null;
    images: string[];
    stock: number;
    brand: string | null;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: Product;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  imageUrl: string | null;
  price: string | number;
  quantity: number;
  size: string | null;
  color: string | null;
  product?: { slug: string } | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string | number;
  shipping: string | number;
  tax: string | number;
  total: string | number;
  shipFullName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPostalCode: string;
  shipCountry: string;
  shipPhone: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface Address {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const money = (value: string | number | null | undefined): string => {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};
