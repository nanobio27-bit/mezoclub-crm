export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  segment: string | null;
  status: string;
  manager_id: number | null;
  source: string | null;
  notes: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
