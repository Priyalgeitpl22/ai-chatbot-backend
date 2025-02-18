export interface AIResponse {
  message?: string,
  status: number, 
  question?: string,
  answer?: string
  task_creation?: boolean
}

export interface Organization {
  id?: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: number | null;
  domain?: string;
  industry?: string;
}