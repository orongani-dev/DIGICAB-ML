import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Clock, Calendar, Users, Key, Database, 
  Shield, Activity, Save, Plus, Trash2, Layout,
  Layers, Lock, AlertTriangle, Edit2, X
} from 'lucide-react';
import { api } from '../api';
import { Parameter, Holiday, RMO, User } from '../types';
import UserManagementView from './UserManagementView';
import { cn } from '../lib/utils';
import { AnimatePresence } from 'motion/react';

import SessionStatsView from './SessionStatsView';

export default function AdministrationView({ currentUser }: { currentUser: User }) {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'users' | 'rmo' | 'sessions' | 'logs'>('params');
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [rmos, setRmos] = useState<RMO[]>([]);
  const [loading, setLoading] = useState(false);

  // RMO Modal state
  const [isRMOModalOpen, setIsRMOModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingRMO, setEditingRMO] = useState<RMO | null>(null);
  const [rmoFormData, setRmoFormData] = useState({ code: '', name: '', displayOrder: 0 });
  const [holidayFormData, setHolidayFormData] = useState<{date: string, type: 'FERIE' | 'ASTREINTE'}>({ date: new Date().toISOString().split('T')[0], type: 'FERIE' });

  const isManager = ['ADMIN', 'MAIRE', 'SP-ML', 'DC-ML', 'CTML', 'RESPONSABLE'].includes(currentUser.role);

  // Local state for inputs to avoid re-render issues
  const [localParams, setLocalParams] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  useEffect(() => {
    const pMap: Record<string, string> = {};
    parameters.forEach(p => {
      pMap[p.key] = p.value;
    });
    setLocalParams(pMap);
  }, [parameters]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'params') {
        const [p, h] = await Promise.all([api.getParameters(), api.getHolidays()]);
        setParameters(p);
        setHolidays(h);
      } else if (activeSubTab === 'rmo') {
        const r = await api.getRMOs();
        setRmos(r);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateParam = async (key: string, value: string) => {
    if (value === parameters.find(p => p.key === key)?.value) return;
    try {
      await api.updateParameter(key, value);
      loadData();
    } catch (error) {
      alert("Erreur de mise à jour");
    }
  };

  const handleRMOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRMO) {
        await api.updateRMO(editingRMO.id, rmoFormData);
      } else {
        await api.createRMO(rmoFormData);
      }
      setIsRMOModalOpen(false);
      setEditingRMO(null);
      setRmoFormData({ code: '', name: '', displayOrder: 0 });
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteRMO = async (id: number) => {
    if (!confirm("Supprimer cette unité RMO ?")) return;
    try {
      await api.deleteRMO(id);
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addHoliday(holidayFormData);
      setIsHolidayModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm("Supprimer cet évènement du calendrier ?")) return;
    try {
      await api.deleteHoliday(id);
      loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openRMOModal = (rmo?: RMO) => {
    if (rmo) {
      setEditingRMO(rmo);
      setRmoFormData({ code: rmo.code, name: rmo.name, displayOrder: rmo.displayOrder });
    } else {
      setEditingRMO(null);
      setRmoFormData({ code: '', name: '', displayOrder: rmos.length + 1 });
    }
    setIsRMOModalOpen(true);
  };

  const subTabs = [
    { id: 'params', label: 'Paramètres Système', icon: Settings },
    { id: 'users', label: 'Utilisateurs & Droits', icon: Shield },
    { id: 'rmo', label: 'Unités Responsables', icon: Layers },
    ...(isManager ? [{ id: 'sessions', label: 'Gestion Présence', icon: Clock }] : []),
    { id: 'logs', label: 'Historique & Logs', icon: Activity },
  ];

  return (
    <div className="p-8 h-full flex flex-col gap-8 bg-slate-50 overflow-hidden">
      {/* Header Administration */}
      <div className="flex flex-col">
        <h2 className="text-3xl font-serif font-black text-navy uppercase tracking-tighter">Console d'Administration</h2>
        <p className="text-[0.7rem] font-bold text-text-muted uppercase tracking-[4px] mt-1">Supervision Structurelle du Cabinet du Maire</p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-2 p-1 bg-navy/5 rounded-2xl w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeSubTab === tab.id 
                ? 'bg-navy text-gold shadow-lg transform scale-105' 
                : 'text-navy/60 hover:bg-navy/10'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {activeSubTab === 'params' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Identité de l'Application */}
             <div className="bg-surface p-8 rounded-2xl shadow-xl border-2 border-gold/20">
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 bg-gold text-navy rounded-xl shadow-lg"><Layout size={24} /></div>
                   <div>
                      <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter">Identité de l'Application</h3>
                      <p className="text-[0.65rem] font-bold text-text-muted uppercase tracking-widest">Configuration visuelle du Cabinet</p>
                   </div>
                </div>
                
                <div className="space-y-6">
                   {parameters.filter(p => ['app_name', 'mairie_name', 'dash_subtitle', 'port_subtitle', 'sync_label'].includes(p.key)).map(param => (
                     <div key={param.id} className="flex flex-col gap-2 p-4 bg-bg rounded-xl border border-border-theme group hover:border-gold transition-all">
                        <span className="text-[0.6rem] font-black text-navy uppercase tracking-widest">
                           {param.key === 'app_name' ? "Nom du Système" : 
                            param.key === 'mairie_name' ? "Entité Officielle" :
                            param.key === 'dash_subtitle' ? "Sous-titre Tableau de Bord" :
                            param.key === 'port_subtitle' ? "Sous-titre Portefeuille" :
                            "Slogan / Label Synchronisation"}
                        </span>
                        <input 
                          type="text"
                          value={localParams[param.key] || ''}
                          onChange={(e) => setLocalParams({...localParams, [param.key]: e.target.value})}
                          onBlur={(e) => {
                             handleUpdateParam(param.key, e.target.value);
                             window.dispatchEvent(new CustomEvent('settings-updated'));
                          }}
                          className="border border-border-theme rounded-lg p-2 bg-white font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                     </div>
                   ))}
                </div>
             </div>

             {/* Horaires */}
             <div className="bg-surface p-8 rounded-2xl shadow-xl border-2 border-gold/20">
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 bg-navy text-gold rounded-xl shadow-lg"><Clock size={24} /></div>
                   <div>
                      <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter">Horaires de Travail</h3>
                      <p className="text-[0.65rem] font-bold text-text-muted uppercase tracking-widest">Base de calcul des délais CAB-ML</p>
                   </div>
                </div>
                
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                   {parameters.filter(p => !['app_name', 'mairie_name', 'dash_subtitle', 'port_subtitle', 'sync_label'].includes(p.key)).map(param => (
                     <div key={param.id} className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border-theme group hover:border-gold transition-all">
                        <span className="text-xs font-black text-navy uppercase tracking-tight">
                           {param.key === 'heure_debut' ? 'HEURE DE DÉBUT' :
                            param.key === 'heure_fin' ? 'HEURE DE FIN' :
                            param.key === 'heure_pause_debut' ? 'DÉBUT PAUSE DÉJEUNER' :
                            param.key === 'heure_pause_fin' ? 'FIN PAUSE DÉJEUNER' :
                            param.key === 'delai_moyen_traitement' ? 'DÉLAI MOYEN TRAITEMENT (HEURES)' :
                            param.key === 'seuil_alerte_echeance' ? 'SEUIL D\'ALERTE (HEURES)' :
                            param.key.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <input 
                          type={param.key.startsWith('heure') ? 'time' : 'text'}
                          value={localParams[param.key] || ''}
                          onChange={(e) => setLocalParams({...localParams, [param.key]: e.target.value})}
                          onBlur={(e) => handleUpdateParam(param.key, e.target.value)}
                          className="border border-border-theme rounded-lg p-2 bg-white font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                        />
                     </div>
                   ))}
                </div>
             </div>

             {/* Calendrier / Jours Fériés */}
             <div className="bg-surface p-8 rounded-2xl shadow-xl border-2 border-gold/20">
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 bg-gold text-navy rounded-xl shadow-lg"><Calendar size={24} /></div>
                   <div>
                      <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter">Calendrier Exécutif</h3>
                      <p className="text-[0.65rem] font-bold text-text-muted uppercase tracking-widest">Jours non ouvrés & Astreintes</p>
                   </div>
                </div>
                <button 
                  onClick={() => setIsHolidayModalOpen(true)}
                  className="w-full bg-navy text-gold font-black py-4 rounded-xl uppercase tracking-[4px] text-xs mb-8 hover:bg-navy-light transition-all shadow-xl flex items-center justify-center gap-2"
                >
                   <Plus size={18} /> Ajouter une Exception
                </button>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                   {holidays.map(h => (
                     <div key={h.id} className="p-4 bg-bg border-border-theme border rounded-xl flex justify-between items-center group relative overflow-hidden">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-border-theme text-navy shadow-inner">
                              <Calendar size={16} />
                           </div>
                           <div>
                              <span className="text-sm font-black text-navy uppercase">{new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                              <p className="text-[0.6rem] text-text-muted uppercase font-bold tracking-widest mt-0.5">{h.type === 'FERIE' ? 'Jour Férié / Non Ouvré' : 'Journée d\'Astreinte'}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className={cn(
                             "px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-widest border",
                             h.type === 'FERIE' ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                           )}>
                              {h.type === 'FERIE' ? 'FÉRIÉ' : 'ASTREINTE'}
                           </span>
                           <button 
                             onClick={() => handleDeleteHoliday(h.id)}
                             className="p-2 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-bold"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="bg-surface rounded-2xl shadow-xl border-2 border-gold/20 overflow-hidden h-[700px]">
            <UserManagementView currentUser={currentUser} />
          </div>
        )}

        {activeSubTab === 'sessions' && <SessionStatsView />}

          {activeSubTab === 'rmo' && (
          <div className="bg-surface p-8 rounded-2xl shadow-xl border-2 border-gold/20">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-navy text-gold rounded-xl shadow-lg"><Layers size={24} /></div>
                   <div>
                      <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter">Unités Responsables (CAB-ML)</h3>
                      <p className="text-[0.65rem] font-bold text-text-muted uppercase tracking-widest">Hiérarchie structurelle du Cabinet</p>
                   </div>
                </div>
                <button 
                  onClick={() => openRMOModal()}
                  className="bg-navy text-gold px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-navy-light transition-all shadow-lg"
                >
                   <Plus size={18} /> Nouvelle Unité
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rmos.map(rmo => (
                  <div key={rmo.id} className="p-6 bg-bg border-2 border-border-theme rounded-2xl group hover:border-gold transition-all relative">
                     <div className="flex justify-between items-start mb-4">
                        <span className="bg-navy text-gold px-2 py-1 rounded text-[0.65rem] font-black">{rmo.code}</span>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => openRMOModal(rmo)}
                             className="p-2 text-text-muted hover:text-navy"
                           ><Edit2 size={14} /></button>
                           <button 
                             onClick={() => handleDeleteRMO(rmo.id)}
                             className="p-2 text-text-muted hover:text-rose-500"
                           ><Trash2 size={14} /></button>
                        </div>
                     </div>
                     <h4 className="font-serif font-black text-navy uppercase text-sm mb-2 leading-tight">{rmo.name}</h4>
                     <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-widest">Ordre de priorité : {rmo.displayOrder}</p>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="bg-surface p-8 rounded-2xl shadow-xl border-2 border-gold/20 min-h-[500px] flex flex-col items-center justify-center text-center">
             <Activity size={64} className="text-navy/5 mb-4 animate-pulse" />
             <h3 className="text-2xl font-serif font-black text-navy/20 uppercase tracking-tighter">Module de Traçabilité Avancée</h3>
             <p className="text-[0.7rem] font-bold text-text-muted uppercase tracking-[3px] max-w-sm mt-2">
                Le monitoring des flux de données et des transactions API est en cours de déploiement sécurisé.
             </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isRMOModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRMOModalOpen(false)}
              className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface w-full max-w-md rounded-2xl shadow-2xl border-2 border-gold overflow-hidden"
            >
              <div className="p-6 bg-navy text-gold flex justify-between items-center">
                 <h3 className="text-xl font-serif font-black uppercase tracking-tighter">
                   {editingRMO ? "Modifier l'Unité" : "Nouvelle Unité"}
                 </h3>
                 <button onClick={() => setIsRMOModalOpen(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleRMOSubmit} className="p-6 space-y-4">
                 <div>
                    <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest mb-1 block">Code de l'Unité</label>
                    <input 
                      type="text" 
                      required
                      value={rmoFormData.code}
                      onChange={e => setRmoFormData({...rmoFormData, code: e.target.value})}
                      placeholder="Ex: DC, SP, SC..."
                      className="w-full bg-bg border border-border-theme p-3 rounded-xl font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                 </div>
                 <div>
                    <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest mb-1 block">Nom complet de l'Unité</label>
                    <input 
                      type="text" 
                      required
                      value={rmoFormData.name}
                      onChange={e => setRmoFormData({...rmoFormData, name: e.target.value})}
                      placeholder="Ex: Direction du Cabinet"
                      className="w-full bg-bg border border-border-theme p-3 rounded-xl font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                 </div>
                 <div>
                    <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest mb-1 block">Ordre d'affichage</label>
                    <input 
                      type="number" 
                      required
                      value={rmoFormData.displayOrder}
                      onChange={e => setRmoFormData({...rmoFormData, displayOrder: parseInt(e.target.value)})}
                      className="w-full bg-bg border border-border-theme p-3 rounded-xl font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                 </div>
                 <button 
                  type="submit"
                  className="w-full py-4 bg-navy text-gold font-black rounded-xl shadow-lg hover:bg-navy-light transition-all uppercase tracking-widest text-xs mt-4"
                 >
                    Enregistrer l'Unité
                 </button>
              </form>
            </motion.div>
          </div>
        )}

        {isHolidayModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHolidayModalOpen(false)}
              className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface w-full max-w-md rounded-2xl shadow-2xl border-2 border-gold overflow-hidden"
            >
              <div className="p-6 bg-navy text-gold flex justify-between items-center">
                 <h3 className="text-xl font-serif font-black uppercase tracking-tighter">
                   Ajouter une Exception
                 </h3>
                 <button onClick={() => setIsHolidayModalOpen(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
                 <div>
                    <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest mb-1 block">Date</label>
                    <input 
                      type="date" 
                      required
                      value={holidayFormData.date}
                      onChange={e => setHolidayFormData({...holidayFormData, date: e.target.value})}
                      className="w-full bg-bg border border-border-theme p-3 rounded-xl font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                 </div>
                 <div>
                    <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest mb-1 block">Type d'exception</label>
                    <select 
                      value={holidayFormData.type}
                      onChange={e => setHolidayFormData({...holidayFormData, type: e.target.value as any})}
                      className="w-full bg-bg border border-border-theme p-3 rounded-xl font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold"
                    >
                       <option value="FERIE">JOUR FÉRIÉ / NON OUVRÉ</option>
                       <option value="ASTREINTE">JOURNÉE D'ASTREINTE</option>
                    </select>
                 </div>
                 <button 
                  type="submit"
                  className="w-full py-4 bg-navy text-gold font-black rounded-xl shadow-lg hover:bg-navy-light transition-all uppercase tracking-widest text-xs mt-4"
                 >
                    Enregistrer l'Exception
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
