export interface Product {
  id?: number;
  name: string;
  brand?: string;
  category?: string;
  conditionNote?: string;
  price?: number | null;
  currency?: string;
  status?: string;
  description?: string;
  imageUrls?: string[];
}

export interface WishlistRequest {
  customerName: string;
  customerPhone: string;
  whatsappNumber?: string;
  desiredItems: string;
  notes?: string;
}

export interface BookingRequest {
  customerName: string;
  customerPhone: string;
  whatsappNumber?: string;
  productId?: number | null;
  productName?: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}
