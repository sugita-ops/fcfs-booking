// API Request/Response Types
export interface ClaimRequest {
  slotId: string;
  companyId: string;
  requestId: string;
}

export interface ClaimResponse {
  slot: {
    id: string;
    status: string;
    work_date: string;
  };
  claim: {
    id: string;
    company_id: string;
    user_id: string | null;
    claimed_at: string;
  };
}

export interface AlternativesResponse {
  alternatives: Array<{
    slot_id: string;
    work_date: string;
    job_post: {
      id: string;
      title: string;
      trade: string;
    };
  }>;
}

export interface ApiError {
  code: string;
  message: string;
}

// Database Types
export interface JobSlot {
  id: string;
  tenant_id: string;
  job_post_id: string;
  work_date: string;
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  claimed_by_company: string | null;
  claimed_by_user: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  tenant_id: string;
  job_slot_id: string;
  company_id: string;
  user_id: string | null;
  request_id: string;
  claimed_at: string;
}

export interface JobPost {
  id: string;
  tenant_id: string;
  project_id: string;
  trade: string;
  title: string;
  description: string | null;
  unit_price: number;
  currency: string;
  start_date: string;
  end_date: string;
}

export interface CancelClaimRequest {
  slotId: string;
  reason: 'no_show' | 'weather' | 'client_change' | 'material_delay' | 'other';
}

export interface CancelClaimResponse {
  slot: {
    id: string;
    status: 'cancelled';
    canceled_at: string;
    cancel_reason: string;
  };
}

export interface IntegrationOutboxEvent {
  event_id: string;
  event_name: string;
  payload: any;
  target: string;
}