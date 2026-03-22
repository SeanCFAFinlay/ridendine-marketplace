// ==========================================
// API CONTRACT TYPES
// ==========================================

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Search & Filter
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Auth
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  profile: {
    type: 'customer' | 'chef' | 'driver' | 'admin';
    id: string;
    name: string;
  } | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Orders
export interface CreateOrderRequest {
  storefrontId: string;
  deliveryAddressId: string;
  items: CreateOrderItemRequest[];
  specialInstructions?: string;
  tip?: number;
  promoCode?: string;
}

export interface CreateOrderItemRequest {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  selectedOptions?: {
    optionId: string;
    valueId: string;
  }[];
}

export interface UpdateOrderStatusRequest {
  status: string;
  notes?: string;
}

// Cart
export interface AddToCartRequest {
  storefrontId: string;
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
  selectedOptions?: {
    optionId: string;
    valueId: string;
  }[];
}

export interface UpdateCartItemRequest {
  quantity?: number;
  specialInstructions?: string;
  selectedOptions?: {
    optionId: string;
    valueId: string;
  }[];
}

// Reviews
export interface CreateReviewRequest {
  orderId: string;
  rating: number;
  comment?: string;
}

// Chef
export interface UpdateStorefrontRequest {
  name?: string;
  description?: string;
  cuisineTypes?: string[];
  coverImageUrl?: string;
  logoUrl?: string;
  minOrderAmount?: number;
  estimatedPrepTimeMin?: number;
  estimatedPrepTimeMax?: number;
}

export interface CreateMenuItemRequest {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  dietaryTags?: string[];
  prepTimeMinutes?: number;
}

// Driver
export interface UpdateDriverLocationRequest {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface RespondToDeliveryOfferRequest {
  response: 'accepted' | 'rejected';
  rejectionReason?: string;
}

export interface ConfirmPickupRequest {
  photoUrl?: string;
}

export interface ConfirmDropoffRequest {
  photoUrl?: string;
  signatureUrl?: string;
}
