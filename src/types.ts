export type UserRole = 
  | 'ADMIN' 
  | 'ML' 
  | 'STANDARD' 
  | 'RESPONSABLE' 
  | 'SPECIAL' 
  | 'EXTERIEUR'
  | 'SP-ML'
  | 'DC-ML'
  | 'SC-ML'
  | 'CS-ML'
  | 'CTML';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name: string;
  avatar?: string;
  canCreateAccounts: boolean;
  permissions?: string;
  is_active: boolean;
  is_responsible?: boolean;
  sessionId?: number;
}

export interface SessionStats {
  daily: { period: string; total: number; count: number }[];
  weekly: { period: string; total: number; count: number }[];
  monthly: { period: string; total: number; count: number }[];
  userStats: { name: string; total: number; sessions: number }[];
}

export type DossierStatus = 
  | 'EN_ATTENTE_SIGNATURE' 
  | 'TRAITE' 
  | 'SUSPENDU' 
  | 'ANNULE' 
  | 'TRANSFERE' 
  | 'ARCHIVE' 
  | 'EN_COPIL' 
  | 'EN_COTECH' 
  | 'EN_COMEV' 
  | 'REJETE' 
  | 'EN_CORRECTION'
  | 'TRAITÉ ET VALIDÉ';

export type DossierPriority = 'Normale' | 'Urgente' | 'Faible';
export type DossierCircuit = 'Normal SP' | 'Normal SC' | 'Digitalisation';

export interface RMO {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
}

export interface Dossier {
  id: number;
  number: string;
  object: string;
  entreprise?: string; // Ajouté V2.2
  contact_person?: string;
  contact_phone?: string;
  rmo_id?: number;
  rmo_code?: string;
  rmo_name?: string;
  status: DossierStatus;
  priority: DossierPriority;
  circuit: DossierCircuit;
  date_instruction: string;
  date_signature?: string;
  date_echeance?: string;
  current_holder?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  transferred_from_id?: number;
  delai?: number; // Calculé en heures ouvrées
  validation_status?: 'PENDING' | 'VALIDATED';
  creator_id?: number;
}

export interface RMOStat {
  rmoId: number;
  rmoCode: string;
  affected: number;
  signed: number;
  waiting: number;
  suspended: number;
  annulled: number;
  transferred: number;
  archived: number;
  persPercent: number;
  genPercent: number;
}

export interface PortfolioKPIs {
  global: {
    active: number;
    signed: number;
    conversionRate: number;
    avgDelay: number;
  };
  rmoStats: RMOStat[];
}

export interface Parameter {
  id: number;
  key: string;
  value: string;
}

export interface Holiday {
  id: number;
  date: string;
  type: 'FERIE' | 'ASTREINTE';
}

export interface Committee {
  id: number;
  name: string;
  description: string;
  created_at: string;
  member_count?: number;
}

export interface ChatSession {
  id: number;
  manager_id: number;
  participant_id: number;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
  closed_at?: string;
  participant_name?: string;
  participant_role?: string;
  manager_name?: string;
  unread_count?: number;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  timestamp: string;
}
