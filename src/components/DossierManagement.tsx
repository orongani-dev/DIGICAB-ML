import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Plus, FileText, ArrowRightLeft, 
  PauseCircle, XCircle, CheckCircle, Archive, Eye,
  RefreshCw, ChevronLeft, ChevronRight, History, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Dossier, RMO, User } from '../types';
import { api } from '../api';
import DossierDetailView from './DossierDetailView';
import DossierModal from './DossierModal';

interface DossierManagementProps {
  user: User;
}

export default function DossierManagement({ user }: DossierManagementProps) {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [rmos, setRmos] = useState<RMO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'TOUS' | 'EN_COURS' | 'SIGNES' | 'AUTRES'>('EN_COURS');
  const [selectedDossierId, setSelectedDossierId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchDossiers();
  }, []);

  const fetchDossiers = async () => {
    setLoading(true);
    try {
      const [dData, rData] = await Promise.all([
        api.getDossiers(),
        api.getRMOs()
      ]);
      setDossiers(dData);
      setRmos(rData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = (dossiers || []).filter(d => {
    const matchesSearch = (d.number || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.object || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'EN_COURS') return matchesSearch && !['TRAITÉ ET VALIDÉ', 'TRAITE', 'ARCHIVE', 'SUSPENDU', 'ANNULE'].includes(d.status);
    if (activeTab === 'SIGNES') return matchesSearch && ['TRAITÉ ET VALIDÉ', 'TRAITE'].includes(d.status);
    if (activeTab === 'AUTRES') return matchesSearch && ['ARCHIVE', 'SUSPENDU', 'ANNULE', 'TRANSFERE'].includes(d.status);
    return matchesSearch;
  });

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-navy uppercase tracking-wider">Gestion des Dossiers Cabinet ML</h2>
          <p className="text-text-muted text-[0.7rem] font-bold uppercase tracking-[2px] mt-1">Life-Cycle & Workflow Management • DIGICAB ML V2.2</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-navy text-white px-5 py-2.5 rounded shadow-lg hover:bg-navy-light transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
        >
          <Plus size={18} />
          Nouveau Dossier
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-theme">
        {[
          { id: 'EN_COURS', label: 'En cours d\'instruction' },
          { id: 'SIGNES', label: 'Signés & Validés' },
          { id: 'AUTRES', label: 'Suspendus / Archives' },
          { id: 'TOUS', label: 'Tous les dossiers' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-bold text-[0.75rem] uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? 'text-navy' : 'text-text-muted hover:text-navy'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="mgtTab" className="absolute bottom-0 left-0 right-0 h-1 bg-gold" />
            )}
          </button>
        ))}
      </div>

      {/* Actions & Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-surface p-4 rounded-lg border border-border-theme shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Recherche par N° Dossier, Objet, RMO..." 
            className="w-full pl-11 pr-4 py-2.5 bg-bg border border-border-theme rounded focus:outline-none focus:ring-2 focus:ring-navy/5 focus:border-navy transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={fetchDossiers} className="p-2.5 hover:bg-bg rounded border border-border-theme text-text-muted transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 bg-surface px-4 py-2.5 border border-border-theme rounded text-text-muted hover:bg-bg transition-all text-sm font-bold uppercase tracking-wider shadow-sm">
            <Filter size={18} />
            Filtrer
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-hidden relative">
        <div className="bg-surface rounded-lg border border-border-theme shadow-sm overflow-hidden flex flex-col h-full">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-bg/50 border-b border-border-theme sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">N° Dossier</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">Entreprise / Entité</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">Objet du dossier</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">RMO / Titulaire</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">Statut</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">Échéance</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px]">Délai (H.O)</th>
                  <th className="px-6 py-4 text-[0.65rem] font-bold text-text-muted uppercase tracking-[2px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-theme/50">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-4"><div className="h-8 bg-bg rounded w-full"></div></td>
                    </tr>
                  ))
                ) : filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-muted font-bold text-sm bg-bg/20">
                      Aucun dossier trouvé dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredDossiers.map((d, idx) => (
                    <tr 
                      key={d.id} 
                      onClick={() => setSelectedDossierId(d.id)}
                      className={`hover:bg-gold/10 transition-all cursor-pointer group ${idx % 2 === 1 ? 'bg-bg/10' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-navy tracking-tight text-[0.75rem] border-b-2 border-gold/40 pb-0.5 group-hover:border-gold">{d.number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[0.7rem] font-black text-navy uppercase">{d.entreprise || '---'}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs xl:max-w-md">
                        <p className="text-[0.75rem] font-black text-navy line-clamp-1 leading-snug uppercase" title={d.object}>{d.object}</p>
                        <div className="flex items-center gap-3 mt-1 opacity-80">
                           <span className="flex items-center gap-1 text-[0.6rem] font-bold text-text-muted uppercase bg-bg px-1 rounded">
                             <RefreshCw size={10} className="text-gold" /> {d.circuit}
                           </span>
                           <span className="flex items-center gap-1 text-[0.6rem] font-bold text-text-muted uppercase">
                             Instruction : {format(new Date(d.date_instruction), 'dd/MM/yyyy')}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="bg-navy text-gold px-1.5 py-0.5 rounded text-[0.65rem] font-black w-fit mb-1">{d.rmo_code}</span>
                          <span className="text-[0.65rem] font-bold text-text-muted italic">Détenteur : {d.current_holder || 'S.P'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[0.6rem] font-black uppercase tracking-tighter shadow-sm border ${
                          d.status === 'TRAITÉ ET VALIDÉ' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          d.status === 'EN_ATTENTE_SIGNATURE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          d.status === 'REJETE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          d.status === 'SUSPENDU' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {d.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-[0.7rem] font-bold text-navy/70">
                          {d.date_echeance ? (
                            <>
                              <Clock size={12} className="text-gold" />
                              {format(new Date(d.date_echeance), 'dd/MM/yyyy')}
                            </>
                          ) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[0.75rem] font-black ${(d.delai || 0) > 48 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {Math.round(d.delai || 0)}h
                          </span>
                          <div className="w-12 h-1 bg-bg rounded-full overflow-hidden">
                             <div 
                               className={`h-full ${(d.delai || 0) > 48 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                               style={{ width: `${Math.min((d.delai || 0) / 48 * 100, 100)}%` }}
                             />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 px-1">
                           <button 
                             onClick={() => setSelectedDossierId(d.id)}
                             className="p-2 bg-navy text-gold hover:bg-navy-light rounded shadow-sm transition-all"
                             title="Gérer le Workflow"
                           >
                             <Eye size={14} />
                           </button>
                           <button 
                             className="p-2 bg-bg text-navy hover:bg-gold/20 rounded border border-border-theme transition-all"
                             title="Historique des mouvements"
                           >
                              <History size={14} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Placeholder */}
          <div className="bg-bg/50 border-t border-border-theme p-4 flex items-center justify-between">
            <span className="text-[0.7rem] text-text-muted font-bold uppercase tracking-widest">
              Affichage 1 - {(filteredDossiers || []).length} sur {(dossiers || []).length} dossiers
            </span>
            <div className="flex items-center gap-4">
               <button className="flex items-center gap-1 text-[0.7rem] font-bold text-text-muted hover:text-navy transition-colors uppercase">
                 <ChevronLeft size={14} /> Précédent
               </button>
               <div className="flex items-center gap-2">
                 <span className="w-6 h-6 bg-navy text-white rounded flex items-center justify-center text-[0.7rem] font-bold">1</span>
                 <span className="w-6 h-6 hover:bg-slate-200 rounded flex items-center justify-center text-[0.7rem] font-bold text-text-muted cursor-pointer transition-colors">2</span>
               </div>
               <button className="flex items-center gap-1 text-[0.7rem] font-bold text-text-muted hover:text-navy transition-colors uppercase">
                 Suivant <ChevronRight size={14} />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals Overlay */}
      <AnimatePresence>
        {selectedDossierId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm" onClick={() => setSelectedDossierId(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative w-full max-w-5xl h-full max-h-[85vh] z-20"
            >
              <DossierDetailView 
                dossierId={selectedDossierId} 
                user={user} 
                onClose={() => setSelectedDossierId(null)} 
                onUpdate={fetchDossiers}
              />
            </motion.div>
          </div>
        )}

        {showCreateModal && (
          <DossierModal 
            isOpen={showCreateModal}
            user={user}
            rmos={rmos}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchDossiers();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
