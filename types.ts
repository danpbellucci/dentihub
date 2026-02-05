
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clinic_roles: {
        Row: {
          id: string
          clinic_id: string
          name: string
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          label: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          label?: string
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          clinic_id: string
          role: string
          module: string
          is_allowed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          role: string
          module: string
          is_allowed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          role?: string
          module?: string
          is_allowed?: boolean
          created_at?: string
        }
      }
      role_notifications: {
        Row: {
          id: string
          clinic_id: string
          role: string
          notification_type: string
          is_enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          role: string
          notification_type: string
          is_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          role?: string
          notification_type?: string
          is_enabled?: boolean
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          role: string
          clinic_id: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role: string
          clinic_id: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          clinic_id?: string
          created_at?: string
        }
      }
      clinics: {
        Row: {
          id: string
          name: string
          slug: string
          address: string | null
          city: string | null
          state: string | null
          observation: string | null
          logo_url: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          subscription_tier: 'free' | 'starter' | 'pro'
          created_at: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Insert: {
          id: string
          name: string
          slug: string
          address?: string | null
          city?: string | null
          state?: string | null
          observation?: string | null
          logo_url?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          subscription_tier?: 'free' | 'starter' | 'pro'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          address?: string | null
          city?: string | null
          state?: string | null
          observation?: string | null
          logo_url?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          subscription_tier?: 'free' | 'starter' | 'pro'
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          clinic_id: string
          name: string
          email: string | null
          whatsapp: string | null
          cpf: string | null
          address: string | null
          birth_date: string | null
          clinical_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          email?: string | null
          whatsapp?: string | null
          cpf?: string | null
          address?: string | null
          birth_date?: string | null
          clinical_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          email?: string | null
          whatsapp?: string | null
          cpf?: string | null
          address?: string | null
          birth_date?: string | null
          clinical_notes?: string | null
          created_at?: string
        }
      }
      dentists: {
        Row: {
          id: string
          clinic_id: string
          name: string
          specialties: string[] | null
          services: Json[] | null
          accepted_plans: string[] | null
          schedule_config: Json | null
          color: string
          email: string | null
          phone: string | null
          cro: string | null
          cpf: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          specialties?: string[] | null
          services?: Json[] | null
          accepted_plans?: string[] | null
          schedule_config?: Json | null
          color?: string
          email?: string | null
          phone?: string | null
          cro?: string | null
          cpf?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          specialties?: string[] | null
          services?: Json[] | null
          accepted_plans?: string[] | null
          schedule_config?: Json | null
          color?: string
          email?: string | null
          phone?: string | null
          cro?: string | null
          cpf?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          clinic_id: string
          dentist_id: string
          client_id: string
          service_name: string
          start_time: string
          end_time: string
          amount: number | null
          status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed'
          payment_status: 'paid' | 'pending'
          return_date?: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          dentist_id: string
          client_id: string
          service_name: string
          start_time: string
          end_time: string
          amount?: number | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'confirmed'
          payment_status?: 'paid' | 'pending'
          return_date?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          dentist_id?: string
          client_id?: string
          service_name?: string
          start_time?: string
          end_time?: string
          amount?: number | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'confirmed'
          payment_status?: 'paid' | 'pending'
          return_date?: string | null
        }
      }
      appointment_requests: {
        Row: {
          id: string
          clinic_id: string
          dentist_id: string
          patient_name: string
          patient_phone: string
          patient_email: string
          patient_cpf?: string | null
          patient_birth_date?: string | null
          patient_address?: string | null
          service_name: string
          requested_time: string
          status: 'pending' | 'accepted' | 'rejected'
        }
        Insert: {
          id?: string
          clinic_id: string
          dentist_id: string
          patient_name: string
          patient_phone: string
          patient_email: string
          patient_cpf?: string | null
          patient_birth_date?: string | null
          patient_address?: string | null
          service_name: string
          requested_time: string
          status?: 'pending' | 'accepted' | 'rejected'
        }
        Update: {
          id?: string
          clinic_id?: string
          dentist_id?: string
          patient_name?: string
          patient_phone?: string
          patient_email?: string
          patient_cpf?: string | null
          patient_birth_date?: string | null
          patient_address?: string | null
          service_name?: string
          requested_time?: string
          status?: 'pending' | 'accepted' | 'rejected'
        }
      }
      transactions: {
        Row: {
          id: string
          clinic_id: string
          amount: number
          category: string
          type: 'income' | 'expense'
          status: 'pending' | 'completed'
          date: string
          appointment_id: string | null
          observation: string | null
          payment_method: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          amount: number
          category: string
          type: 'income' | 'expense'
          status: 'pending' | 'completed'
          date: string
          appointment_id?: string | null
          observation?: string | null
          payment_method?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          amount?: number
          category?: string
          type?: 'income' | 'expense'
          status?: 'pending' | 'completed'
          date?: string
          appointment_id?: string | null
          observation?: string | null
          payment_method?: string | null
        }
      }
      clinical_records: {
        Row: {
            id: string
            clinic_id: string
            client_id: string
            dentist_id: string | null
            date: string
            description: string
            created_at: string
        }
        Insert: {
            id?: string
            clinic_id: string
            client_id: string
            dentist_id?: string | null
            date?: string
            description: string
            created_at?: string
        }
        Update: {
            id?: string
            clinic_id?: string
            client_id?: string
            dentist_id?: string | null
            date?: string
            description?: string
            created_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          clinic_id: string
          type: 'reminder' | 'birthday' | 'agenda' | 'recall' | 'welcome' | 'urgent_reminder' | 'system' | 'marketing_campaign' | 'stock_alert'
          recipient_name: string
          recipient_email: string
          subject: string
          status: 'sent' | 'failed'
          sent_at: string
          related_id: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          type: 'reminder' | 'birthday' | 'agenda' | 'recall' | 'welcome' | 'urgent_reminder' | 'system' | 'marketing_campaign' | 'stock_alert'
          recipient_name: string
          recipient_email: string
          subject: string
          status?: 'sent' | 'failed'
          sent_at?: string
          related_id?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          type?: 'reminder' | 'birthday' | 'agenda' | 'recall' | 'welcome' | 'urgent_reminder' | 'system' | 'marketing_campaign' | 'stock_alert'
          recipient_name?: string
          recipient_email?: string
          subject?: string
          status?: 'sent' | 'failed'
          sent_at?: string
          related_id?: string | null
        }
      }
      inventory_items: {
        Row: {
          id: string
          clinic_id: string
          name: string
          quantity: number
          min_quantity: number
          unit: string | null
          category: string | null
          updated_at: string
          dentist_id?: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          quantity: number
          min_quantity?: number
          unit?: string | null
          category?: string | null
          updated_at?: string
          dentist_id?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          quantity?: number
          min_quantity?: number
          unit?: string | null
          category?: string | null
          updated_at?: string
          dentist_id?: string | null
        }
      }
    }
    Views: {
      public_clinics: {
        Row: {
          id: string
          name: string
          slug: string
          address: string | null
          city: string | null
          state: string | null
          logo_url: string | null
          phone: string | null
          whatsapp: string | null
          observation: string | null
        }
      }
      public_dentists: {
        Row: {
          id: string
          clinic_id: string
          name: string
          specialties: string[] | null
          services: Json[] | null
          accepted_plans: string[] | null
          schedule_config: Json | null
        }
      }
      public_appointments: {
        Row: {
          start_time: string
          end_time: string
          dentist_id: string
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  cpf: string;
  address: string;
  birth_date: string;
  clinical_notes: string;
  created_at?: string;
}

export interface ServiceItem {
  name: string;
  price: number;
  duration: number; // in minutes
  is_variable_price?: boolean;
  covered_by_plans?: boolean;
}

export interface Dentist {
  id: string;
  name: string;
  specialties: string[];
  services: ServiceItem[];
  accepted_plans: string[];
  color: string;
  schedule_config?: any;
  email?: string;
  phone?: string;
  cro?: string;
  cpf?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  status: 'pending' | 'completed';
  date: string;
  appointment_id?: string | null;
  observation?: string | null;
  payment_method?: string | null;
}

export interface Appointment {
  id: string;
  dentist_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  service_name: string;
  amount?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed';
  payment_status?: 'paid' | 'pending';
  return_date?: string | null;
  dentist?: Dentist;
  client?: Client;
}

export interface ClinicalRecord {
  id: string;
  client_id: string;
  dentist_id: string | null;
  date: string;
  description: string;
  dentist?: { name: string };
}

export interface Communication {
    id: string;
    type: 'reminder' | 'birthday' | 'agenda' | 'recall' | 'welcome' | 'urgent_reminder' | 'system' | 'marketing_campaign' | 'stock_alert';
    recipient_name: string;
    recipient_email: string;
    subject: string;
    status: 'sent' | 'failed';
    sent_at: string;
    related_id?: string | null;
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    min_quantity: number;
    unit: string;
    category: string;
    updated_at?: string;
    dentist_id?: string | null;
    dentist?: { name: string };
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  clinic_id: string;
  clinics?: {
      name: string;
      subscription_tier?: string;
  } | null;
}

export interface ClinicRole {
    name: string;
    label: string;
}
