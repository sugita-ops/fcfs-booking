/**
 * Supabase Database Types
 * Generated for マルチテナント協力業者評価システム
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          status: 'active' | 'suspended' | 'deleted';
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          status?: 'active' | 'suspended' | 'deleted';
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          status?: 'active' | 'suspended' | 'deleted';
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_users: {
        Row: {
          id: string;
          tenant_id: string;
          auth_user_id: string | null;
          email: string;
          name: string;
          role: 'admin' | 'manager' | 'member';
          status: 'active' | 'suspended' | 'deleted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          auth_user_id?: string | null;
          email: string;
          name: string;
          role: 'admin' | 'manager' | 'member';
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          auth_user_id?: string | null;
          email?: string;
          name?: string;
          role?: 'admin' | 'manager' | 'member';
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
      };
      subcontractors: {
        Row: {
          id: string;
          auth_user_id: string | null;
          code: string;
          company_name: string;
          representative_name: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          trades: string[];
          certifications: string[];
          service_areas: ServiceAreas;
          status: 'active' | 'suspended' | 'deleted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          code: string;
          company_name: string;
          representative_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          trades?: string[];
          certifications?: string[];
          service_areas?: ServiceAreas;
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          code?: string;
          company_name?: string;
          representative_name?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          trades?: string[];
          certifications?: string[];
          service_areas?: ServiceAreas;
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_subcontractors: {
        Row: {
          id: string;
          tenant_id: string;
          subcontractor_id: string;
          invited_at: string;
          invited_by: string | null;
          status: 'active' | 'suspended' | 'removed';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          subcontractor_id: string;
          invited_at?: string;
          invited_by?: string | null;
          status?: 'active' | 'suspended' | 'removed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          subcontractor_id?: string;
          invited_at?: string;
          invited_by?: string | null;
          status?: 'active' | 'suspended' | 'removed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          address: string | null;
          start_date: string | null;
          end_date: string | null;
          status: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
          budget: number | null;
          manager_id: string | null;
          external_id: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          address?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
          budget?: number | null;
          manager_id?: string | null;
          external_id?: string | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          address?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
          budget?: number | null;
          manager_id?: string | null;
          external_id?: string | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_posts: {
        Row: {
          id: string;
          tenant_id: string;
          project_id: string;
          title: string;
          trade: string;
          description: string | null;
          unit_price: number | null;
          currency: string;
          start_date: string | null;
          end_date: string | null;
          recruitment_type: 'open' | 'nominated';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          project_id: string;
          title: string;
          trade: string;
          description?: string | null;
          unit_price?: number | null;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          recruitment_type?: 'open' | 'nominated';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          project_id?: string;
          title?: string;
          trade?: string;
          description?: string | null;
          unit_price?: number | null;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          recruitment_type?: 'open' | 'nominated';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_slots: {
        Row: {
          id: string;
          tenant_id: string;
          job_post_id: string;
          work_date: string;
          status: 'available' | 'applied' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          assigned_subcontractor_id: string | null;
          assigned_at: string | null;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          job_post_id: string;
          work_date: string;
          status?: 'available' | 'applied' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          assigned_subcontractor_id?: string | null;
          assigned_at?: string | null;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          job_post_id?: string;
          work_date?: string;
          status?: 'available' | 'applied' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
          assigned_subcontractor_id?: string | null;
          assigned_at?: string | null;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      slot_applications: {
        Row: {
          id: string;
          job_slot_id: string;
          subcontractor_id: string;
          applied_at: string;
          status: 'pending' | 'selected' | 'rejected' | 'withdrawn';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_slot_id: string;
          subcontractor_id: string;
          applied_at?: string;
          status?: 'pending' | 'selected' | 'rejected' | 'withdrawn';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_slot_id?: string;
          subcontractor_id?: string;
          applied_at?: string;
          status?: 'pending' | 'selected' | 'rejected' | 'withdrawn';
          notes?: string | null;
          created_at?: string;
        };
      };
      nominated_subcontractors: {
        Row: {
          id: string;
          job_post_id: string;
          subcontractor_id: string;
          nominated_at: string;
          nominated_by: string | null;
          notified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_post_id: string;
          subcontractor_id: string;
          nominated_at?: string;
          nominated_by?: string | null;
          notified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_post_id?: string;
          subcontractor_id?: string;
          nominated_at?: string;
          nominated_by?: string | null;
          notified_at?: string | null;
          created_at?: string;
        };
      };
      completion_reports: {
        Row: {
          id: string;
          job_slot_id: string;
          subcontractor_id: string;
          completion_date: string;
          summary: string | null;
          photo_urls: string[];
          reported_at: string;
          status: 'pending' | 'confirmed' | 'rejected';
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_slot_id: string;
          subcontractor_id: string;
          completion_date: string;
          summary?: string | null;
          photo_urls?: string[];
          reported_at?: string;
          status?: 'pending' | 'confirmed' | 'rejected';
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_slot_id?: string;
          subcontractor_id?: string;
          completion_date?: string;
          summary?: string | null;
          photo_urls?: string[];
          reported_at?: string;
          status?: 'pending' | 'confirmed' | 'rejected';
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      evaluations: {
        Row: {
          id: string;
          tenant_id: string;
          completion_report_id: string | null;
          subcontractor_id: string;
          job_slot_id: string;
          schedule_rating: number | null;
          safety_rating: number | null;
          quality_rating: number | null;
          cost_rating: number | null;
          comment: string | null;
          evaluated_by: string | null;
          evaluated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          completion_report_id?: string | null;
          subcontractor_id: string;
          job_slot_id: string;
          schedule_rating?: number | null;
          safety_rating?: number | null;
          quality_rating?: number | null;
          cost_rating?: number | null;
          comment?: string | null;
          evaluated_by?: string | null;
          evaluated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          completion_report_id?: string | null;
          subcontractor_id?: string;
          job_slot_id?: string;
          schedule_rating?: number | null;
          safety_rating?: number | null;
          quality_rating?: number | null;
          cost_rating?: number | null;
          comment?: string | null;
          evaluated_by?: string | null;
          evaluated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      monthly_reports: {
        Row: {
          id: string;
          subcontractor_id: string;
          report_month: string;
          trades: string[];
          service_areas: ServiceAreas;
          availability_start: string | null;
          availability_end: string | null;
          certifications: string[];
          capacity: Capacity;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subcontractor_id: string;
          report_month: string;
          trades?: string[];
          service_areas?: ServiceAreas;
          availability_start?: string | null;
          availability_end?: string | null;
          certifications?: string[];
          capacity?: Capacity;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subcontractor_id?: string;
          report_month?: string;
          trades?: string[];
          service_areas?: ServiceAreas;
          availability_start?: string | null;
          availability_end?: string | null;
          certifications?: string[];
          capacity?: Capacity;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_type: 'tenant_user' | 'subcontractor';
          recipient_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_type: 'tenant_user' | 'subcontractor';
          recipient_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_type?: 'tenant_user' | 'subcontractor';
          recipient_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          data?: Json;
          read_at?: string | null;
          created_at?: string;
        };
      };
      csv_import_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          import_type: 'subcontractors' | 'evaluations';
          file_name: string | null;
          total_rows: number;
          success_count: number;
          error_count: number;
          errors: Json;
          imported_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          import_type: 'subcontractors' | 'evaluations';
          file_name?: string | null;
          total_rows?: number;
          success_count?: number;
          error_count?: number;
          errors?: Json;
          imported_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          import_type?: 'subcontractors' | 'evaluations';
          file_name?: string | null;
          total_rows?: number;
          success_count?: number;
          error_count?: number;
          errors?: Json;
          imported_by?: string | null;
          created_at?: string;
        };
      };
      admin_users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          name: string;
          role: 'super_admin' | 'admin' | 'support';
          status: 'active' | 'suspended' | 'deleted';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          name: string;
          role: 'super_admin' | 'admin' | 'support';
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string;
          name?: string;
          role?: 'super_admin' | 'admin' | 'support';
          status?: 'active' | 'suspended' | 'deleted';
          created_at?: string;
          updated_at?: string;
        };
      };
      master_trades: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      master_areas: {
        Row: {
          id: string;
          prefecture: string;
          city: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          prefecture: string;
          city?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          prefecture?: string;
          city?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      get_user_tenant_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_user_subcontractor_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_admin_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_tenant_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_subcontractor_user: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {};
  };
}

// Custom Types
export interface ServiceAreas {
  prefectures: string[];
  cities: string[];
}

export interface Capacity {
  teams: number;
  workers_per_team: number;
  notes: string;
}

// Convenience Types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Entity Types
export type Tenant = Tables<'tenants'>;
export type TenantUser = Tables<'tenant_users'>;
export type Subcontractor = Tables<'subcontractors'>;
export type TenantSubcontractor = Tables<'tenant_subcontractors'>;
export type Project = Tables<'projects'>;
export type JobPost = Tables<'job_posts'>;
export type JobSlot = Tables<'job_slots'>;
export type SlotApplication = Tables<'slot_applications'>;
export type NominatedSubcontractor = Tables<'nominated_subcontractors'>;
export type CompletionReport = Tables<'completion_reports'>;
export type Evaluation = Tables<'evaluations'>;
export type MonthlyReport = Tables<'monthly_reports'>;
export type Notification = Tables<'notifications'>;
export type CsvImportLog = Tables<'csv_import_logs'>;
export type AdminUser = Tables<'admin_users'>;
export type MasterTrade = Tables<'master_trades'>;
export type MasterArea = Tables<'master_areas'>;

// Insert Types
export type TenantInsert = InsertTables<'tenants'>;
export type TenantUserInsert = InsertTables<'tenant_users'>;
export type SubcontractorInsert = InsertTables<'subcontractors'>;
export type ProjectInsert = InsertTables<'projects'>;
export type JobPostInsert = InsertTables<'job_posts'>;
export type JobSlotInsert = InsertTables<'job_slots'>;
export type EvaluationInsert = InsertTables<'evaluations'>;
export type CompletionReportInsert = InsertTables<'completion_reports'>;
export type MonthlyReportInsert = InsertTables<'monthly_reports'>;

// Extended Types (with relations)
export interface JobSlotWithRelations extends JobSlot {
  job_post: JobPost;
  project?: Project;
  assigned_subcontractor?: Subcontractor;
  applications?: SlotApplication[];
}

export interface SubcontractorWithEvaluations extends Subcontractor {
  evaluations?: Evaluation[];
  average_ratings?: {
    schedule: number;
    safety: number;
    quality: number;
    cost: number;
    overall: number;
  };
}

export interface EvaluationWithRelations extends Evaluation {
  subcontractor?: Subcontractor;
  job_slot?: JobSlotWithRelations;
  evaluated_by_user?: TenantUser;
}
