
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface SubscriptionPlan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    features: string[];
    is_active: boolean;
    is_popular: boolean;
    is_enterprise: boolean;
    display_order: number;
    max_dentists?: number | null;
    max_patients?: number | null;
    max_ai_usage?: number | null;
    ai_usage_limit_type?: 'daily' | 'total';
    // Campos para calculadora dinâmica e checkout
    price_per_dentist?: number;
    price_per_ai_block?: number;
    ai_block_size?: number;
    stripe_dentist_price_id?: string;
    stripe_ai_price_id?: string;
    updated_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'administrator' | 'dentist' | 'employee';
  clinic_id: string;
  clinics?: {
    name: string;
    subscription_tier: string;
  };
}

export interface ClinicRole {
    name: string;
    label: string;
}

export interface ServiceItem {
  name: string;
  price: number;
  duration: number;
  is_variable_price?: boolean;
  covered_by_plans?: boolean;
}

export interface Dentist {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cro?: string;
  cpf?: string;
  color?: string;
  specialties?: string[];
  clinic_id: string;
  services?: ServiceItem[] | string[];
  schedule_config?: any;
  accepted_plans?: string[];
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  cpf?: string;
  address?: string;
  birth_date?: string;
  clinical_notes?: string;
  clinic_id: string;
}

export interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  service_name: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'paid' | 'pending';
  amount?: number;
  client_id: string;
  dentist_id: string;
  clinic_id: string;
  client?: { name: string; email?: string };
  dentist?: { name: string; color?: string };
  created_at?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  status: 'pending' | 'completed';
  date: string;
  observation?: string;
  payment_method?: string;
  dentist_id?: string;
  clinic_id: string;
  dentist?: { name: string };
}

export interface Communication {
  id: string;
  type: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  clinic_id: string;
  related_id?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  unit?: string;
  category?: string;
  dentist_id?: string;
  clinic_id: string;
  dentist?: { name: string };
  updated_at?: string;
}
