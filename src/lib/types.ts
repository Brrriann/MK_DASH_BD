export type ClientStatus = "active" | "potential" | "dormant" | "ended";
export type TaskStatus = "todo" | "in_progress" | "done" | "on_hold";
export type TaskPriority = "high" | "medium" | "low";
export type MeetingMethod = "in_person" | "video" | "phone" | "email";
export type EstimateStatus = "pending" | "accepted" | "expired";
export type ContractStatus = "signed" | "pending" | "expired" | "signature_requested";
export type ProjectStatus = "active" | "completed" | "on_hold";
export type PipelineStage = '상담' | '견적' | '계약' | '계산서발행' | '계약입금' | '착수' | '납품' | '완납';
export type ServiceType = '명함' | '로고' | '웹사이트' | '쇼핑몰' | '앱' | '광고소재' | 'SNS관리' | '영상편집' | '기타';
export type SourceChannel = '숨고' | '크몽' | '위시캣' | '라우드소싱' | 'Fiverr' | '직접문의' | '재구매' | '기타';

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
  business_registration_number: string | null;
  representative_name: string | null;
  business_address: string | null;
  business_type: string | null;
  business_item: string | null;
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
  pipeline_stage: PipelineStage;
  service_type: ServiceType | null;
  contract_amount: number | null;
  deposit_ratio: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  final_paid: boolean;
  final_paid_at: string | null;
  deadline: string | null;
  source_channel: SourceChannel | null;
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

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
}

export interface TaxInvoice {
  id: string;
  title: string;
  items: InvoiceItem[];
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  amount: number;
  issued_at: string;
  pdf_url: string | null;
  memo: string | null;
  bolta_issuance_key: string | null;
  client_id: string | null;
  payment_received: boolean;
  payment_received_at: string | null;
  project_id: string | null;
  created_at: string;
}

export interface EstimateItem {
  name: string;
  quantity: number;
  unit_price: number;
  supply_amount: number;
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
  line_items: EstimateItem[];
  include_vat: boolean;
  discount_amount: number;
  deposit_ratio: number | null;
  project_id: string | null;
  description: string | null;
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
  contract_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  final_amount: number | null;
  final_paid: boolean;
  final_paid_at: string | null;
  terms: string | null;
  project_id: string | null;
  // e-서명
  signature_token: string | null;
  signature_token_expires_at: string | null;
  signature_token_used_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signature_image_url: string | null;
  signed_pdf_url: string | null;
  created_at: string;
}
