export interface ApiUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: ApiUser;
}

export interface Profile {
  id?: number;
  phone?: string | null;
  summary?: string | null;
  skills?: string[];
  experience?: string | null;
  education?: string | null;
  location?: string | null;
  desiredRole?: string | null;
  desiredSalary?: number | null;
  modality?: string | null;
  cvFilePath?: string | null;
  cvOriginalName?: string | null;
}

export interface WorkerConfig {
  id?: number;
  keywords: string[];
  portals: string[];
  intervalMinutes: number;
  minSalary?: number | null;
  minMatchPercent?: number;
  modality?: string | null;
  model: string;
  enabled: boolean;
  autoApply: boolean;
  notifyWhatsapp: boolean;
  whatsappPhone?: string | null;
  lastRunAt?: string | null;
}

export interface Job {
  id: number;
  title: string;
  company?: string | null;
  location?: string | null;
  url?: string | null;
  applyUrl?: string | null;
  description?: string | null;
  matchPercent?: number | null;
  matchReason?: string | null;
  status: string;
  postedAt?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
}

export interface Application {
  id: number;
  jobId?: number | null;
  job?: Job | null;
  status: 'applied' | 'interview' | 'rejected' | 'accepted';
  interviewAt?: string | null;
  notes?: string | null;
  appliedAt: string;
}
