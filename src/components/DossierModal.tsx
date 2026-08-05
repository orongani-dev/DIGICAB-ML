import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, FileUp, Calendar } from 'lucide-react';
import { api } from '../api';
import { Dossier, RMO, User } from '../types';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  rmos: RMO[];
  dossier?: Dossier | null;
}

export default function DossierModal({ isOpen, onClose, onSuccess, user, rmos, dossier }: DossierModalProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<Partial<Dossier>>({
    number: '',
    object: '',
    entreprise: '',
    rmo_id: undefined,
    status: 'EN_ATTENTE_SIGNATURE' as any,
    priority: 'Normale',
    circuit: 'Normal SP',
    date_instruction: new Date().toISOString(),
    current_holder: user.name,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getUsers().then(setAllUsers).catch(console.error);
    if (dossier) {
      setFormData(dossier);
    } else {
      const savedUser = JSON.parse(localStorage.getItem('digicab_user') || '{}');
      setFormData({
        number: '', 
        object: '',
        rmo_id: savedUser.role === 'ML' ? undefined : (rmos[0]?.id),
        status: 'EN_COURS' as any,
        priority: 'Normale',
        circuit: 'Normal SP',
        date_instruction: new Date().toISOString(),
        current_holder: user.name,
      });
    }
  }, [dossier, rmos, user]);

  const isML = user.role === 'ML';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dataToSave = { 
        ...formData, 
        createdBy: user.id,
        // If ML, ensure it's pending validation
        validation_status: isML ? 'PENDING' : 'VALIDATED'
      };
      
      if (isML) {
        // Find hierarchical supervisor (for simplicity, we send to a default one or let server handle)
        // The prompt says "automatiquement affecté a son responsable hierarchique"
        delete dataToSave.rmo_id; 
      }
      if (dossier) {
        await api.updateDossier(dossier.id, dataToSave);
      } else {
        const { id } = await api.createDossier(dataToSave, user.role);
        if (files.length > 0) {
          await api.uploadFiles(id as number, files);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="relative bg-surface w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-gold"
      >
        <div className="bg-navy p-5 flex items-center justify-between shrink-0 border-b-2 border-gold">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gold rounded flex items-center justify-center text-navy shadow-inner">
              <FileUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-white tracking-tight">
                {dossier ? 'Modification Dossier Cabinet' : 'Enregistrement Nouveau Dossier CAB-ML'}
              </h2>
              <p className="text-gold/70 text-[0.65rem] font-bold uppercase tracking-[3px] mt-0.5">Cabinet du Maire de Libreville • DIGICAB ML</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto bg-bg/30">
          <div className="bg-white p-5 rounded-lg border border-border-theme shadow-sm space-y-4">
            <h3 className="text-navy font-bold text-[0.7rem] uppercase tracking-widest border-b border-border-theme pb-2 mb-4 flex items-center gap-2">
              <AlertCircle size={14} className="text-gold" />
              Identification & Références
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Numéro de Dossier (CAB/ML)</label>
                <input 
                  type="text" 
                  value={formData.number || ''}
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                  className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none focus:border-navy transition-all font-bold text-navy"
                  placeholder="Laisser vide pour une génération automatique"
                  required={!!dossier} // Only required if editing, server generates if new
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">UNITÉ (Direction d'Opération)</label>
                <select 
                  value={formData.rmo_id || ''}
                  disabled={isML}
                  onChange={(e) => setFormData({...formData, rmo_id: parseInt(e.target.value)})}
                  className={`w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none focus:border-navy transition-all font-bold text-navy ${isML ? 'bg-slate-100 opacity-70 cursor-not-allowed' : ''}`}
                  required={!isML}
                >
                  <option value="">{isML ? 'Traitement par Responsable...' : 'Sélectionner une Unité Opérationnelle...'}</option>
                  {rmos.map(rmo => (
                    <option key={rmo.id} value={rmo.id}>{rmo.code} - {rmo.name}</option>
                  ))}
                </select>
                {isML && (
                  <p className="text-[0.6rem] text-gold font-black italic mt-1">Affectation automatique au responsable hiérarchique pour validation.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Entreprise / Entité Concernée</label>
                <input 
                  type="text" 
                  value={formData.entreprise || ''}
                  onChange={(e) => setFormData({...formData, entreprise: e.target.value})}
                  className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none focus:border-navy transition-all font-bold text-navy"
                  placeholder="Ex: SEEG, AXA, État..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Gérant / Point Focal</label>
                <input 
                  type="text" 
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none focus:border-navy transition-all font-bold text-navy"
                  placeholder="Nom du contact"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Numéro de Téléphone (Client)</label>
              <input 
                type="text" 
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none focus:border-navy transition-all font-bold text-navy"
                placeholder="077xxxxxx"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Objet du Dossier (Intitulé exact)</label>
              <textarea 
                value={formData.object || ''}
                onChange={(e) => setFormData({...formData, object: e.target.value})}
                className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none focus:border-navy transition-all min-h-[100px] text-sm font-medium leading-relaxed"
                placeholder="Décrivez l'objet du dossier avec précision..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-lg border border-border-theme shadow-sm space-y-4">
              <h3 className="text-navy font-bold text-[0.7rem] uppercase tracking-widest border-b border-border-theme pb-2 mb-2">Paramètres de Circuit</h3>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Niveau de Priorité</label>
                  <div className="flex gap-2">
                    {['Basse', 'Normale', 'Urgente'].map(p => (
                      <button
                        key={p}
                        type="button"
                        disabled={isML}
                        onClick={() => setFormData({...formData, priority: p as any})}
                        className={`flex-1 py-1.5 rounded text-[0.65rem] font-bold uppercase transition-all border ${
                          formData.priority === p 
                            ? 'bg-navy text-white border-navy shadow-md' 
                            : 'bg-white text-text-muted border-border-theme hover:bg-bg'
                        } ${isML ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Circuit de Validation</label>
                  <select 
                    value={formData.circuit || ''}
                    onChange={(e) => setFormData({...formData, circuit: e.target.value as any})}
                    className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none text-sm font-bold text-navy"
                  >
                    <option value="Normal SP">Cabinet (Normal SP)</option>
                    <option value="Normal SC">Secrétariat Central (SC)</option>
                    <option value="Conseiller">Conseiller Technique</option>
                    <option value="Instruction Directe">Instruction Directe PMA</option>
                    <option value="Digitalisation">Processus Digitalisation</option>
                  </select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {allUsers.filter(u => {
                      if (formData.circuit === 'Normal SP') return ['SP-ML', 'ADMIN'].includes(u.role);
                      if (formData.circuit === 'Normal SC') return ['SC-ML', 'ADMIN'].includes(u.role);
                      if (formData.circuit === 'Conseiller') return ['CS-ML', 'ADMIN'].includes(u.role);
                      return u.role === 'ADMIN' || u.role === 'RESPONSABLE';
                    }).slice(0, 3).map(u => (
                      <span key={u.id} className="text-[0.6rem] bg-navy/5 px-2 py-0.5 rounded border border-navy/10 font-bold text-navy truncate max-w-[100px]">
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Collaborateur Affecté (Action)</label>
                  <input 
                    type="text" 
                    value={formData.current_holder || ''}
                    onChange={(e) => setFormData({...formData, current_holder: e.target.value})}
                    placeholder="Ex: Stéphane MANON"
                    className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none text-sm font-bold text-navy"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-border-theme shadow-sm space-y-4">
              <h3 className="text-navy font-bold text-[0.7rem] uppercase tracking-widest border-b border-border-theme pb-2 mb-2">Dates & Échéances</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Date d'Arrivée / Instruction</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold pointer-events-none" />
                    <input 
                      type="datetime-local" 
                      value={formData.date_instruction?.slice(0, 16) || ''}
                      onChange={(e) => setFormData({...formData, date_instruction: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()})}
                      className="w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none text-sm font-bold text-navy"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider ml-1">Date d'Échéance (Optionnel)</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold/50 pointer-events-none" />
                    <input 
                      type="date" 
                      disabled={isML}
                      value={formData.date_echeance ? formData.date_echeance.slice(0, 10) : ''}
                      onChange={(e) => setFormData({...formData, date_echeance: e.target.value ? new Date(e.target.value).toISOString() : null})}
                      className={`w-full px-4 py-2 bg-bg border border-border-theme rounded focus:outline-none text-sm font-bold text-navy ${isML ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  {isML ? (
                    <p className="text-[0.6rem] text-rose-500 italic leading-tight">Accès réservé aux Responsables.</p>
                  ) : (
                    <p className="text-[0.6rem] text-text-muted italic leading-tight">Le système enverra une alerte 24h avant cette date.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-border-theme shadow-sm space-y-3">
            <h3 className="text-navy font-bold text-[0.7rem] uppercase tracking-widest border-b border-border-theme pb-2 mb-1">Pièces Jointes & Justificatifs</h3>
            <div className="group relative border-2 border-dashed border-border-theme hover:border-gold hover:bg-gold/5 transition-all rounded-lg p-6 flex flex-col items-center justify-center gap-1 cursor-pointer">
              <input 
                type="file" 
                multiple 
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <FileUp className="text-gold mb-2" size={32} />
              <p className="text-xs font-bold text-navy uppercase tracking-tight">Déposez les scans du dossier ici</p>
              <p className="text-[0.6rem] text-text-muted">Formats acceptés : PDF, JPG, PNG (Max 200MB)</p>
              
              {files.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {files.map((file, i) => (
                    <span key={i} className="bg-navy text-white px-3 py-1 rounded text-[0.65rem] font-bold shadow-sm">
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-danger p-4 rounded border-l-4 border-danger flex items-center gap-3 text-xs font-bold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4 shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-border-theme rounded font-bold text-text-muted hover:bg-bg transition-all uppercase tracking-widest text-[0.7rem]"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-navy text-white rounded font-bold hover:bg-navy-light shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[0.7rem] border-2 border-navy disabled:opacity-50"
            >
              {loading ? (
                <RefreshCcw className="animate-spin" size={16} />
              ) : (
                <Save size={16} className="text-gold" />
              )}
              {dossier ? 'Mettre à jour le dossier' : 'Valider & Enregistrer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const RefreshCcw = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>
);
