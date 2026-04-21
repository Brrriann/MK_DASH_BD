export type ClientStatus = "active" | "potential" | "dormant" | "ended";
export type TaskStatus = "todo" | "in_progress" | "done" | "on_hold";
export type TaskPriority = "high" | "medium" | "low";
export type MeetingMethod = "in_person" | "video" | "phone" | "email";
export type EstimateStatus = "pending" | "accepted" | "expired";
export type ContractStatus = "signed" | "pending" | "expired";
export type ProjectStatus = "active" | "completed" | "on_hold";

export interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  industry: string | null;
  status: ClientStatus;
  source: string | null;
  portal_token: string;
  portal_expires_at: string | null;
  notes: string | null;
  first_contract_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientWithRevenue extends Client {
  total_revenue: number;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: string;
  client_id: string | null;
  title: string;
  met_at: string;
  attendees: string[];
  method: MeetingMethod | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxInvoice {
  id: string;
  title: string;
  amount: number;
  issued_at: string;
  pdf_url: string | null;
  client_id: string | null;
  created_at: string;
}

export interface Estimate {
  id: string;
  title: string;
  amount: number;
  status: EstimateStatus;
  pdf_url: string | null;
  client_id: string | null;
  issued_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  pdf_url: string | null;
  client_id: string | null;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
}
