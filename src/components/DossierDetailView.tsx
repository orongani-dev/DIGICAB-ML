import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, Clock, User, FileText, ArrowRightLeft, 
  PauseCircle, XCircle, CheckCircle, Archive, RotateCcw,
  MessageSquare, History, Paperclip, Download, Send,
  AlertCircle, Building2, Users, FileEdit, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { Dossier, RMO, User as UserType } from '../types';
import { api } from '../api';

interface DossierDetailViewProps {
  dossierId: number;
  user: UserType;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DossierDetailView({ dossierId, user, onClose, onUpdate }: DossierDetailViewProps) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [rmos, setRmos] = useState<RMO[]>([]);
  const [committees, setCommittees] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [targetUserId, setTargetUserId] = useState<number | ''>('');
  const [targetRmoId, setTargetRmoId] = useState<number | ''>('');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<number | ''>('');
  const [isEditingEcheance, setIsEditingEcheance] = useState(false);
  const [newEcheance, setNewEcheance] = useState('');

  useEffect(() => {
    fetchData();
  }, [dossierId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dData, lData, fData, rData, cData, uData] = await Promise.all([
        fetch(`/api/dossiers/${dossierId}`).then(res => res.json()),
        fetch(`/api/logs/dossier/${dossierId}`).then(res => res.json()),
        fetch(`/api/files/${dossierId}`).then(res => res.json()),
        api.getRMOs(),
        api.getCommittees(),
        api.getUsers()
      ]);
      setDossier(dData);
      setLogs(lData);
      setFiles(fData);
      setRmos(rData);
      setCommittees(cData);
      setAllUsers(uData);
      if (dData.date_echeance) {
        setNewEcheance(format(new Date(dData.date_echeance), 'yyyy-MM-dd'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isDecisionMaker = ['ADMIN', 'MAIRE', 'SP-ML', 'DC-ML', 'SC-ML', 'CS-ML', 'CTML', 'RESPONSABLE'].includes(user.role);
  const isResponsible = isDecisionMaker || user.is_responsible === true || (user as any).is_responsible === 1;

  const handleUpdateEcheance = async () => {
    if (!newEcheance) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/dossiers/${dossierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           ...dossier,
           date_echeance: newEcheance,
           userId: user.id,
           actionDetails: `Modification de la date d'échéance : ${newEcheance}`
        })
      });
      if (response.ok) {
        setIsEditingEcheance(false);
        fetchData();
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: string, nextStatus?: string) => {
    if (!comment && action !== 'VIEW' && action !== 'RECTIFY') {
      alert('Veuillez saisir un commentaire pour cette action.');
      return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        userId: user.id,
        action,
        details: comment || `Action: ${action}`,
        nextStatus,
      };

      if (action === 'RECTIFY') {
        payload.current_holder = user.name;
        payload.nextStatus = 'EN_COURS';
      }

      if (action === 'TRANSFER') {
        if (targetUserId) {
          const targetUser = allUsers.find(u => u.id === targetUserId);
          if (targetUser) {
            payload.current_holder = targetUser.name;
          }
        }
        if (targetRmoId) {
          payload.nextRmoId = targetRmoId;
        }
      }

      if (action === 'TRANSFER_TO_COMMITTEE' && selectedCommitteeId) {
        payload.committeeId = selectedCommitteeId;
      }

      const response = await fetch(`/api/dossiers/${dossierId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setComment('');
        setTargetUserId('');
        setTargetRmoId('');
        setSelectedCommitteeId('');
        
        // After transfer or rectification, we might want to refresh or close
        if (action === 'TRANSFER' || action === 'TRANSFER_TO_COMMITTEE') {
          onUpdate();
          onClose(); // Automatically close as requested
          return;
        }

        fetchData();
        onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (!dossier || (dossier as any).error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-border-theme h-full">
        <AlertCircle size={48} className="text-gold mb-4" />
        <h3 className="text-navy font-bold">{ (dossier as any)?.error || "Dossier non trouvé" }</h3>
        <button onClick={onClose} className="mt-4 px-6 py-2 bg-navy text-white rounded font-bold">Retour aux dossiers</button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg shadow-xl border border-border-theme overflow-hidden flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="bg-navy p-4 flex items-center justify-between border-b border-gold">
        <div className="flex items-center gap-4">
          <div className="bg-gold text-navy px-3 py-1 rounded font-bold text-sm tracking-widest">
            {dossier.number}
          </div>
          <div>
            <h2 className="text-white font-serif font-bold text-lg leading-none">Détails du Dossier Strategy ML</h2>
            <p className="text-white/50 text-[0.65rem] uppercase tracking-widest mt-1">Cabinet du Maire • Validation Stratégique</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Info & Actions */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border-theme">
          <div className="space-y-6">
            {/* Context Card */}
            <div className="bg-bg p-4 rounded-lg border border-border-theme">
               <h3 className="text-navy font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                 <FileText size={14} className="text-gold" />
                 Objet & Contexte
               </h3>
               {dossier.validation_status === 'PENDING' && (
                 <div className="mb-4 p-4 bg-gold/10 border-2 border-gold rounded-xl animate-pulse">
                    <p className="text-[0.7rem] font-black text-navy uppercase tracking-widest flex items-center gap-2">
                       <AlertCircle size={16} /> Validation en attente
                    </p>
                    <p className="text-[0.6rem] text-navy font-bold mt-1 uppercase tracking-wider">Ce dossier a été soumis par un collaborateur et requiert votre validation stratégique.</p>
                 </div>
               )}
               <p className="text-sm text-text-main font-medium leading-relaxed bg-white p-3 rounded border border-border-theme/50 min-h-[60px]">
                 {dossier.object}
               </p>
               
               <div className="grid grid-cols-2 gap-4 mt-4">
                 <div className="space-y-1">
                   <span className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider block">Entreprise / Entité</span>
                   <span className="text-sm font-bold text-navy flex items-center gap-1.5">
                     <Building2 size={14} className="text-gold" />
                     {dossier.entreprise || "N/A"}
                   </span>
                 </div>
                 <div className="space-y-1">
                   <span className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider block">Affectation Actuelle</span>
                   <span className="text-sm font-bold text-navy flex items-center gap-1.5">
                     <User size={14} className="text-gold" />
                     {dossier.rmo_code} - {dossier.rmo_name}
                   </span>
                 </div>
               </div>
               
               <div className="mt-4 space-y-1">
                 <span className="text-[0.65rem] font-bold text-text-muted uppercase tracking-wider block">Circuit de validation</span>
                 <span className="text-sm font-bold text-navy flex items-center gap-1.5">
                   <RotateCcw size={14} className="text-gold" />
                   {dossier.circuit}
                 </span>
               </div>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface p-3 rounded-lg border border-border-theme shadow-sm">
                <span className="text-[0.6rem] font-bold text-text-muted uppercase block">Instruction</span>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={14} className="text-gold" />
                  <span className="text-xs font-bold text-navy">{format(new Date(dossier.date_instruction), 'dd/MM/yyyy')}</span>
                </div>
              </div>
              <div className="bg-surface p-3 rounded-lg border border-border-theme shadow-sm relative group/echeance">
                <span className="text-[0.6rem] font-bold text-text-muted uppercase block">Échéance</span>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={14} className="text-gold" />
                  {isEditingEcheance ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="date" 
                        value={newEcheance}
                        onChange={(e) => setNewEcheance(e.target.value)}
                        className="text-[0.65rem] border border-border-theme rounded p-0.5 focus:outline-none focus:border-navy"
                      />
                      <button onClick={handleUpdateEcheance} className="text-success"><CheckCircle size={14} /></button>
                      <button onClick={() => setIsEditingEcheance(false)} className="text-danger"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-navy">{dossier.date_echeance ? format(new Date(dossier.date_echeance), 'dd/MM/yyyy') : '-'}</span>
                      {isResponsible && (
                        <button 
                          onClick={() => setIsEditingEcheance(true)}
                          className="opacity-0 group-hover/echeance:opacity-100 transition-opacity p-1 hover:bg-gold/10 rounded text-gold"
                        >
                          <FileEdit size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-surface p-3 rounded-lg border border-border-theme shadow-sm">
                <span className="text-[0.6rem] font-bold text-text-muted uppercase block">Délai Traitement</span>
                <div className="flex items-center gap-2 mt-1">
                  <History size={14} className="text-gold" />
                  <span className={`text-xs font-bold ${ (dossier.delai || 0) > 48 ? 'text-danger' : 'text-success'}`}>
                    {Math.round(dossier.delai || 0)} Heures
                  </span>
                </div>
              </div>
            </div>

            {/* Workflow Actions */}
            <div className="space-y-4">
              <h3 className="text-navy font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <ArrowRightLeft size={14} className="text-gold" />
                Actions de Validation
              </h3>
              
              <div className="bg-white border border-border-theme rounded-lg p-4 space-y-4 shadow-sm">
                {dossier.validation_status === 'PENDING' && isResponsible && (
                  <div className="bg-navy p-5 rounded-xl border-b-4 border-gold mb-4 space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={20} className="text-gold" />
                        <h4 className="text-white font-serif font-bold text-sm uppercase tracking-tighter">Validation du Responsable</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-widest">Unité d'Étude</label>
                           <select 
                             className="w-full bg-white/10 border border-white/20 rounded p-2 text-xs font-bold text-white focus:outline-none"
                             id="validation-rmo"
                             defaultValue={dossier.rmo_id || ''}
                           >
                             {rmos.map(r => (
                               <option key={r.id} value={r.id} className="text-navy">{r.code} - {r.name}</option>
                             ))}
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-widest">Niveau de Priorité</label>
                           <select 
                             className="w-full bg-white/10 border border-white/20 rounded p-2 text-xs font-bold text-white focus:outline-none"
                             id="validation-priority"
                           >
                             <option value="Basse" className="text-navy">Basse</option>
                             <option value="Normale" className="text-navy" selected>Normale</option>
                             <option value="Urgente" className="text-navy">Urgente</option>
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-widest">Date d'Échéance</label>
                           <input 
                             type="date" 
                             className="w-full bg-white/10 border border-white/20 rounded p-2 text-xs font-bold text-white focus:outline-none"
                             id="validation-date"
                           />
                        </div>
                     </div>
                     <button 
                       onClick={() => {
                          const rmoId = parseInt((document.getElementById('validation-rmo') as HTMLSelectElement).value);
                          const priority = (document.getElementById('validation-priority') as HTMLSelectElement).value;
                          const date = (document.getElementById('validation-date') as HTMLInputElement).value;
                          if (!date) {
                             alert("Veuillez définir une date d'échéance.");
                             return;
                          }
                          api.validateDossier(dossier.id, user.id, priority, date, rmoId).then(() => {
                             fetchData();
                             onUpdate();
                          }).catch(err => alert(err.message));
                       }}
                       className="w-full py-3 bg-gold text-navy font-black rounded uppercase tracking-widest text-[0.7rem] hover:bg-gold/90 transition-all flex items-center justify-center gap-2"
                     >
                       <CheckCircle size={16} /> Approuver & Re-affecter au Créateur
                     </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[0.7rem] font-bold text-text-muted uppercase">Commentaire / Observation</label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border border-border-theme rounded text-sm focus:outline-none focus:border-navy transition-all min-h-[80px]"
                    placeholder="Saisissez vos observations pour cette étape..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {['ARCHIVE', 'ANNULE', 'REJETE'].includes(dossier.status) ? (
                    <button 
                      onClick={() => handleAction('REOPEN', 'EN_COURS')}
                      className="action-btn bg-navy text-gold hover:bg-navy-light col-span-full border border-gold"
                    >
                      <RotateCcw size={14} /> Réouvrir le Dossier
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleAction('VALIDATE', 'TRAITÉ ET VALIDÉ')}
                        className="action-btn bg-success text-white hover:bg-emerald-600 col-span-full md:col-span-1 shadow-lg"
                      >
                        <CheckCircle size={14} /> Signature du Maire
                      </button>
                      <button 
                         onClick={() => handleAction('RECTIFY')}
                         className="action-btn bg-amber-500 text-white hover:bg-amber-600"
                         title="Se réaffecter le dossier pour modification"
                      >
                        <RotateCcw size={14} /> Rectification
                      </button>
                      <button 
                        onClick={() => handleAction('SUSPEND', 'SUSPENDU')}
                        className="action-btn bg-slate-500 text-white hover:bg-slate-600"
                      >
                        <PauseCircle size={14} /> Suspendre
                      </button>
                      <button 
                        onClick={() => handleAction('REJECT', 'REJETE')}
                        className="action-btn bg-rose-600 text-white hover:bg-rose-700"
                      >
                        <XCircle size={14} /> Rejeter
                      </button>
                      <button 
                        onClick={() => handleAction('CANCEL', 'ANNULE')}
                        className="action-btn bg-rose-400 text-white hover:bg-rose-500"
                      >
                        <AlertCircle size={14} /> Annuler
                      </button>
                      <button 
                        onClick={() => handleAction('ARCHIVE', 'ARCHIVE')}
                        className="action-btn bg-navy text-white hover:bg-navy-light"
                      >
                        <Archive size={14} /> Archiver
                      </button>
                    </>
                  )}
                </div>

                {/* Transfer to Committee (Digitalisation) */}
                {dossier.circuit === 'Digitalisation' && (
                  <div className="pt-4 border-t border-border-theme mt-4 bg-gold/5 p-3 rounded-lg border border-gold/20">
                    <label className="text-[0.7rem] font-bold text-navy uppercase block mb-1.5 flex items-center gap-2">
                       <Building2 size={14} className="text-navy" />
                       Transférer au Comité Technique
                    </label>
                    <div className="flex gap-2">
                      <select 
                        value={selectedCommitteeId}
                        onChange={(e) => setSelectedCommitteeId(parseInt(e.target.value))}
                        className="flex-1 px-3 py-2 bg-white border border-gold/30 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gold"
                      >
                        <option value="">Sélectionner un comité...</option>
                        {committees.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => handleAction('TRANSFER_TO_COMMITTEE', 'TRANSFERE')}
                        disabled={!selectedCommitteeId}
                        className="px-4 py-2 bg-navy text-white font-bold rounded text-xs hover:bg-navy-light transition-all disabled:opacity-50 shadow-md"
                      >
                        Lancer Digitalisation
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border-theme mt-4">
                  <label className="text-[0.7rem] font-bold text-text-muted uppercase block mb-1.5 flex items-center gap-2">
                     <Users size={14} /> Transférer / Réaffecter le dossier
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select 
                      value={targetRmoId}
                      onChange={(e) => setTargetRmoId(parseInt(e.target.value))}
                      className="px-3 py-2 bg-bg border border-border-theme rounded text-sm focus:outline-none font-bold text-navy"
                    >
                      <option value="">Sélectionner une Unité Responsable...</option>
                      {rmos.map(r => (
                        <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                      ))}
                    </select>
                    <select 
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(parseInt(e.target.value))}
                      className="px-3 py-2 bg-bg border border-border-theme rounded text-sm focus:outline-none font-bold text-navy"
                    >
                      <option value="">Sélectionner un Collaborateur...</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => handleAction('TRANSFER', dossier.status)}
                    disabled={(!targetUserId && !targetRmoId) || actionLoading}
                    className="w-full mt-2 py-2 bg-navy text-gold font-black rounded text-[0.65rem] uppercase tracking-widest hover:bg-navy-light transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <div className="w-3 h-3 border-2 border-gold border-t-transparent animate-spin rounded-full" /> : <Send size={14} />}
                    Valider le Transfert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: History & Files */}
        <div className="w-[340px] bg-bg overflow-y-auto flex flex-col border-l border-border-theme">
          {/* Ownership Status Card */}
          <div className="p-4 border-b border-gold bg-navy text-white">
             <div className="space-y-4">
                <div>
                  <span className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-[2px] block mb-2">Créateur (Portefeuille)</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gold font-bold border border-gold/30 text-[0.65rem] uppercase">
                      {(dossier as any).creator_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-bold uppercase truncate">{(dossier as any).creator_name || 'Système'}</p>
                      <p className="text-[0.55rem] text-gold/60 font-medium">Responsable Titulaire</p>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <span className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-[2px] block mb-2">Détenteur de l'Action</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-navy font-bold shadow-lg text-[0.65rem] uppercase">
                      {dossier.current_holder?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-bold uppercase text-gold truncate">{(dossier.current_holder || 'Non assigné').replace(/^[^-]+ — /, '')}</p>
                      <p className="text-[0.55rem] text-white/50 font-medium">Collaborateur affecté</p>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Files Section */}
          <div className="p-4 border-b border-border-theme">
            <h3 className="text-navy font-bold text-[0.65rem] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Paperclip size={14} className="text-gold" />
              Pièces Jointes
            </h3>
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="text-[0.7rem] text-text-muted italic bg-white/50 p-3 rounded border border-dashed border-border-theme text-center">
                  Aucun fichier joint
                </div>
              ) : (
                files.map(file => (
                  <div key={file.id} className="bg-surface p-2 rounded border border-border-theme flex items-center justify-between group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={14} className="text-navy/40 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-[0.7rem] font-bold text-navy truncate">{file.name}</p>
                        <p className="text-[0.6rem] text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <a 
                      href={`/api/files/download/${file.id}`}
                      className="p-1.5 hover:bg-bg rounded text-gold transition-colors"
                      title="Télécharger"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Logs Section */}
          <div className="p-4 flex-1">
            <h3 className="text-navy font-bold text-[0.65rem] uppercase tracking-widest mb-3 flex items-center gap-2">
              <History size={14} className="text-gold" />
              Historique des Actions
            </h3>
            <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border-theme">
              {logs.map((log, i) => (
                <div key={log.id} className="relative pl-7">
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-surface flex items-center justify-center z-10 ${
                    log.action.includes('VALIDATE') ? 'bg-success text-white' :
                    log.action.includes('TRANSFER') ? 'bg-gold text-navy' :
                    log.action.includes('CANCEL') ? 'bg-danger text-white' : 'bg-navy text-white'
                  }`}>
                    {log.action.includes('VALIDATE') ? <CheckCircle size={10} /> :
                     log.action.includes('TRANSFER') ? <ArrowRightLeft size={10} /> :
                     log.action.includes('CANCEL') ? <XCircle size={10} /> : <FileText size={10} />}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[0.65rem] font-bold text-navy">{log.user_name}</span>
                      <span className="text-[0.6rem] text-text-muted">{format(new Date(log.timestamp), 'dd/MM HH:mm')}</span>
                    </div>
                    <p className="text-[0.7rem] font-bold text-gold-700 leading-tight mb-1">
                      {log.action === 'CREATE_DOSSIER' ? 'Création du dossier' :
                       log.action === 'VALIDATE_DOSSIER' ? 'Validation stratégique' :
                       log.action === 'TRANSFER_DOSSIER' ? 'Transfert de dossier' :
                       log.action === 'RECTIFY_DOSSIER' ? 'Rectification' :
                       log.action === 'SUSPEND_DOSSIER' ? 'Suspension' :
                       log.action === 'REJECT_DOSSIER' ? 'Rejet' :
                       log.action === 'CANCEL_DOSSIER' ? 'Annulation' :
                       log.action === 'ARCHIVE_DOSSIER' ? 'Archivage' :
                       log.action === 'REOPEN_DOSSIER' ? 'Réouverture' :
                       log.action.replace('UPDATE_DOSSIER_', '').replace(/_/g, ' ')}
                    </p>
                    <p className="text-[0.7rem] text-text-muted bg-surface p-2 rounded border border-border-theme/50 italic leading-relaxed">
                      "{log.details.split(': ').slice(1).join(': ') || log.details}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer / Meta */}
      <div className="p-3 bg-bg border-t border-border-theme flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 text-[0.65rem]">
           <span className="text-text-muted">Statut : <strong className="text-navy">{dossier.status.replace(/_/g, ' ')}</strong></span>
           <span className="text-text-muted">Créé le : <strong className="text-navy">{format(new Date(dossier.created_at), 'dd/MM/yyyy')}</strong></span>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-navy border border-gold text-gold font-bold rounded text-xs hover:bg-gold hover:text-navy transition-all"
           >
             Fermer le Dossier
           </button>
           <div className="flex items-center gap-2 ml-4">
              <AlertCircle size={12} className="text-gold" />
              <span className="text-[0.65rem] font-bold text-navy uppercase tracking-wider">Traitement Prioritaire</span>
           </div>
        </div>
      </div>

      <style>{`
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.65rem;
          text-transform: uppercase;
          transition: all 0.2s;
          letter-spacing: 0.05em;
        }
        .action-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
