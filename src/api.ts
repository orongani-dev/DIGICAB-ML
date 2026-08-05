import { Dossier, RMO, PortfolioKPIs, Parameter, Holiday, User, Committee, ChatSession, ChatMessage } from './types';

const API_BASE = '/api';

async function handleResponse(response: Response) {
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    if (contentType && contentType.includes("application/json")) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur inconnue');
    } else {
      const text = await response.text();
      throw new Error(`Erreur serveur (${response.status}): ${text.substring(0, 100)}...`);
    }
  }
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    if (data && data.error && response.ok) {
      // Handle cases where server might return {error: ...} with 200 (shouldn't happen but good to be safe)
      throw new Error(data.error);
    }
    return data;
  }
  return response.text();
}

export const api = {
  // Auth
  getUsers: (): Promise<User[]> => fetch(`${API_BASE}/users`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  createUser: (data: any): Promise<User> => 
    fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  deleteUser: (id: number): Promise<any> => fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' }).then(handleResponse),
  updateUserPermissions: (id: number, data: { permissions: any, is_active: boolean, role: string, is_responsible?: boolean, name?: string, username?: string }): Promise<any> => 
    fetch(`${API_BASE}/users/${id}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  login: (credentials: any): Promise<User> => 
    fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(handleResponse),

  // RMOs
  getRMOs: (): Promise<RMO[]> => fetch(`${API_BASE}/rmos`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  createRMO: (data: Partial<RMO>) => 
    fetch(`${API_BASE}/rmos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  updateRMO: (id: number, data: Partial<RMO>) => 
    fetch(`${API_BASE}/rmos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  deleteRMO: (id: number) => fetch(`${API_BASE}/rmos/${id}`, { method: 'DELETE' }).then(handleResponse),

  // Dossiers
  getDossiers: (): Promise<Dossier[]> => fetch(`${API_BASE}/dossiers`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  createDossier: (data: Partial<Dossier>, userRole?: string) => 
    fetch(`${API_BASE}/dossiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, userRole })
    }).then(handleResponse),
  updateDossier: (id: number, data: Partial<Dossier>) => 
    fetch(`${API_BASE}/dossiers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  advancedSearch: (filters: any): Promise<Dossier[]> => 
    fetch(`${API_BASE}/search/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    }).then(handleResponse).then(data => Array.isArray(data) ? data : []),

  getDossierById: (id: number): Promise<Dossier> => fetch(`${API_BASE}/dossiers/${id}`).then(handleResponse),
  executeDossierAction: (id: number, userId: number, action: string, details: string, nextStatus?: string, nextRmoId?: number, current_holder?: string, priority?: string, date_echeance?: string): Promise<any> => 
    fetch(`${API_BASE}/dossiers/${id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, details, nextStatus, nextRmoId, current_holder, priority, date_echeance })
    }).then(handleResponse),
  getDossierLogs: (id: number): Promise<any[]> => fetch(`${API_BASE}/logs/dossier/${id}`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  validateDossier: (id: number, userId: number, priority: string, date_echeance: string, rmoId?: number): Promise<any> => 
    api.executeDossierAction(id, userId, 'VALIDATE_DOSSIER', 'Validation stratégique et définition des échéances', 'EN_COURS', rmoId, undefined, priority, date_echeance),

  // Portfolio
  getPortfolioKPIs: (): Promise<PortfolioKPIs> => fetch(`${API_BASE}/portfolio/kpis`).then(handleResponse).then(data => data || { global: { active: 0, signed: 0, conversionRate: 0, avgDelay: 0 }, rmoStats: [] }),

  // Params & Holidays
  getParameters: (): Promise<Parameter[]> => fetch(`${API_BASE}/parametres`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  updateParameter: (key: string, value: string) => 
    fetch(`${API_BASE}/parametres/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    }).then(handleResponse),
  
  getHolidays: (): Promise<Holiday[]> => fetch(`${API_BASE}/jours_feries`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  addHoliday: (data: { date: string, type: string }) => 
    fetch(`${API_BASE}/jours_feries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  deleteHoliday: (id: number) => fetch(`${API_BASE}/jours_feries/${id}`, { method: 'DELETE' }).then(handleResponse),

  // Utils
  uploadFiles: (dossierId: number, files: File[]) => {
    const formData = new FormData();
    formData.append('dossierId', dossierId.toString());
    files.forEach(file => formData.append('files', file));
    return fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    }).then(handleResponse);
  },
  getFiles: (dossierId: number) => fetch(`${API_BASE}/files/${dossierId}`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  
  // Committees
  getCommittees: (): Promise<Committee[]> => fetch(`${API_BASE}/committees`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  createCommittee: (data: Partial<Committee>) => 
    fetch(`${API_BASE}/committees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  updateCommittee: (id: number, data: Partial<Committee>) => 
    fetch(`${API_BASE}/committees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  deleteCommittee: (id: number) => fetch(`${API_BASE}/committees/${id}`, { method: 'DELETE' }).then(handleResponse),
  getCommitteeMembers: (committeeId: number): Promise<User[]> => fetch(`${API_BASE}/committees/${committeeId}/members`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  toggleCommitteeMember: (committeeId: number, userId: number) => 
    fetch(`${API_BASE}/committees/${committeeId}/members/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).then(handleResponse),

  // Chat
  getChatSessions: (userId: number, role: string): Promise<ChatSession[]> => fetch(`${API_BASE}/chat/sessions?userId=${userId}&role=${role}`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  startChatSession: (managerId: number, participantId: number): Promise<ChatSession> => 
    fetch(`${API_BASE}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId, participantId })
    }).then(handleResponse),
  closeChatSession: (sessionId: number, userId: number) => 
    fetch(`${API_BASE}/chat/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).then(handleResponse),
  shareChatSession: (sessionId: number, sharedWithId: number) => 
    fetch(`${API_BASE}/chat/sessions/${sessionId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sharedWithId })
    }).then(handleResponse),
  getSharedChatSessions: (userId: number): Promise<ChatSession[]> => fetch(`${API_BASE}/chat/sessions/shared?userId=${userId}`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  getChatMessages: (sessionId: number): Promise<ChatMessage[]> => 
    fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`).then(handleResponse).then(data => Array.isArray(data) ? data : []),
  sendChatMessage: (sessionId: number, senderId: number, content: string) => 
    fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, senderId, content })
    }).then(handleResponse),
  getUnreadCount: (): Promise<{ count: number }> => fetch(`${API_BASE}/chat/unread`).then(handleResponse),
  
  // Session & Admin
  logout: (sessionId?: number) => 
    fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    }).then(handleResponse),
  reportActivity: (sessionId: number) => 
    fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    }).then(handleResponse),
  getSessionStats: () => fetch(`${API_BASE}/admin/sessions/stats`).then(handleResponse),
  resetPassword: (userId: number, newPassword: string) => 
    fetch(`${API_BASE}/admin/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword })
    }).then(handleResponse),
};
