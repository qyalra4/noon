// types/admin.types.ts
export type AdminRole = 
  | 'super_admin' 
  | 'support_supervisor' 
  | 'orders_supervisor' 
  | 'customers_supervisor' 
  | 'drivers_supervisor' 
  | 'invoices_supervisor';

export interface AdminProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AdminFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: AdminRole;
  permissions: string[];
}