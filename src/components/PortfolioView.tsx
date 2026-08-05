import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart as PieChartIcon, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  MoreHorizontal,
  Pause,
  XCircle,
  Archive,
  ArrowRightLeft,
  FileEdit,
  History,
  Eye,
  ShieldCheck,
  Users
} from 'lucide-react';
import { api } from '../api';
import { Dossier, PortfolioKPIs, RMO } from '../types';
import StatCard from './StatCard';
import LogoMairie from './LogoMairie';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import DossierModal from './DossierModal';
import DossierDetailView from './DossierDetailView';
import { Plus } from 'lucide-react';

export default function PortfolioView({ settings }: { settings?: any }) {
  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null);
  const [rmos, setRmos] = useState<RMO[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRmo, setExpandedRmo] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'ACTIFS' | 'SUSPENDUS' | 'ANNULES' | 'TRANSFERES' | 'ARCHIVES' | 'REJETES'>('ACTIFS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [viewingDossierId, setViewingDossierId] = useState<number | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('digicab_user') || '{}');

  useEffect(() => {
    const externalFilter = localStorage.getItem('portfolio_filter');
    if (externalFilter) {
      if (externalFilter === 'TRAITE') setActiveSubTab('ACTIFS'); // Since 'TRAITE' usually shows in active list but handled by status
      else if (externalFilter === 'EN_COURS') setActiveSubTab('ACTIFS');
      else if (externalFilter === 'SOUFFRANCE') setActiveSubTab('ACTIFS');
      else if (externalFilter === 'ACTIFS') setActiveSubTab('ACTIFS');
      
      // We could add more granular filtering here if needed
      localStorage.removeItem('portfolio_filter');
    }
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiData, rmoData, dossierData] = await Promise.all([
        api.getPortfolioKPIs(),
        api.getRMOs(),
        api.getDossiers()
      ]);
      setKpis(kpiData);
      setRmos(rmoData);
      setDossiers(dossierData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dossier: Dossier) => {
    setSelectedDossier(dossier);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedDossier(null);
    setIsModalOpen(true);
  };

  const filteredDossiers = (dossiers || []).filter(d => {
    const matchesSearch = (d.number || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (d.object || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // ML users see only their dossiers
    const isMine = currentUser.role !== 'ML' || d.created_by === currentUser.id;

    if (activeSubTab === 'ACTIFS') {
      return matchesSearch && isMine && !['SUSPENDUS', 'ANNULE', 'TRANSFERE', 'ARCHIVE', 'REJETE'].includes(d.status);
    }
    const statusMap: {[key: string]: string} = {
      'ACTIFS': 'EN_COURS',
      'SUSPENDUS': 'SUSPENDU',
      'ANNULES': 'ANNULE',
      'TRANSFERES': 'TRANSFERE',
      'ARCHIVES': 'ARCHIVE',
      'REJETES': 'REJETE'
    };
    return matchesSearch && isMine && d.status === statusMap[activeSubTab];
  });

  const getDossiersByRmo = (rmoId: number) => {
    return (filteredDossiers || []).filter(d => d.rmo_id === rmoId);
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 relative min-h-screen bg-[#e9f1f7]">
      {/* Background Watermark for Executive Feel */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] overflow-hidden">
         <LogoMairie className="w-[1200px] h-[1200px] grayscale" />
      </div>

      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
             <div className="w-2 h-10 bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] rounded-full" />
             <div>
                <h2 className="text-4xl font-serif font-black text-navy uppercase tracking-tighter">{settings?.app_name || 'Portefeuille Exécutif • ML'}</h2>
                <div className="text-[0.7rem] text-text-muted mt-1 font-black uppercase tracking-[5px] ml-1 opacity-70">{settings?.port_subtitle || 'Pilotage Stratégique / Cabinet du Maire'}</div>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={fetchData}
             className="p-3 bg-white border-2 border-navy/10 rounded-xl text-navy hover:bg-gold/10 transition-all shadow-lg group"
             title="Synchroniser les données"
           >
             <History size={20} className="group-hover:rotate-180 transition-transform duration-500" />
           </button>
           <button 
             onClick={handleCreate}
             className="flex items-center gap-3 bg-navy text-gold px-8 py-4 rounded-xl font-black shadow-2xl hover:bg-navy-light transition-all uppercase tracking-[0.2em] text-[0.8rem] border-b-4 border-gold group"
           >
             <Plus size={20} className="group-hover:scale-125 transition-transform" />
             Initialiser Nouveau Dossier CAB-ML
           </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex space-x-1 bg-navy/5 p-1 rounded-xl backdrop-blur-sm relative z-10">
        {(['ACTIFS', 'REJETES', 'SUSPENDUS', 'ANNULES', 'TRANSFERES', 'ARCHIVES'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 px-4 py-3 font-black text-[0.65rem] transition-all rounded-lg uppercase tracking-widest ${
              activeSubTab === tab 
                ? 'bg-navy text-gold shadow-xl' 
                : 'text-navy/60 hover:bg-white/50 hover:text-navy font-bold'
            }`}
          >
            {tab === 'ACTIFS' ? 'Portefeuille Actif' : 
             tab === 'REJETES' ? 'Rejetés' : 
             tab === 'ANNULES' ? 'Annulations' : tab}
            {activeSubTab === tab && (
              <span className="ml-2 bg-gold/20 text-gold px-2 py-0.5 rounded-full text-[0.55rem]">
                {(filteredDossiers || []).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between relative z-10">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-navy/40 group-focus-within:text-navy transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par N° de dossier ou objet..." 
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-navy/5 rounded-xl shadow-inner focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy transition-all text-sm font-bold placeholder:text-navy/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-3 bg-white px-6 py-3 border-2 border-navy/5 rounded-xl text-navy/70 hover:bg-navy hover:text-white transition-all text-[0.65rem] font-black uppercase tracking-widest shadow-md">
            <Filter size={16} />
            <span>Filtres Avancés</span>
          </button>
        </div>
      </div>

      {/* Table Section - Grouped Style following Excel screenshot */}
      <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border-2 border-navy/20 rounded-xl relative z-10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1800px]">
            <thead className="bg-[#0b1f3a] text-white">
              <tr className="divide-x divide-white/10 uppercase font-black text-[0.55rem] tracking-tight">
                <th className="px-3 py-5 text-center w-40">1. N° DOSSIER</th>
                <th className="px-4 py-5 w-64">2. NOM COLLABORATEUR</th>
                <th className="px-4 py-5 w-64">3. ENTREPRISE / CLIENT</th>
                <th className="px-4 py-5 w-64">4. GÉRANT / POINT FOCAL</th>
                <th className="px-3 py-5 w-40">5. TÉLÉPHONE</th>
                <th className="px-2 py-5 text-center w-40">6. DATE INSTRUCTION</th>
                <th className="px-2 py-5 text-center w-36">7. SIGNATURE ML</th>
                <th className="px-2 py-5 text-center w-36">8. ÉCHÉANCE</th>
                <th className="px-3 py-5 text-center w-28">9. TEMPS (H)</th>
                <th className="px-4 py-5 text-center w-32 bg-[#1a3a5a]">10. UNITÉ</th>
                <th className="px-6 py-5 w-96">11. OBSERVATION / INSTRUCTION</th>
                <th className="px-4 py-5 text-center w-28 bg-[#d2dc79] text-navy">12. % COLLAB.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {(rmos || []).filter(rmo => (filteredDossiers || []).some(d => d.rmo_id === rmo.id)).map(rmo => {
                const groupDossiers = (filteredDossiers || []).filter(d => d.rmo_id === rmo.id);
                const rmoStats = kpis?.rmoStats?.find(s => s.rmoId === rmo.id);
                const isML = currentUser.role === 'ML';
                
                return (
                  <React.Fragment key={rmo.id}>
                    {/* Collaborator Header Row - Excel Style - Hidden for ML as they see only their dossiers */}
                    {!isML && (
                    <tr className="bg-[#d5e3f1] border-y-2 border-navy/40">
                      <td className="px-3 py-3 border-r border-navy/10"></td>
                      <td colSpan={11} className="px-4 py-3 font-black text-navy text-[0.9rem] uppercase tracking-tighter flex items-center gap-3">
                        {rmo.name}
                      </td>
                    </tr>
                    )}
                    
                    {/* Dossiers in Group */}
                    {groupDossiers.map((d, dIdx) => (
                      <tr 
                        key={d.id} 
                        onClick={() => setViewingDossierId(d.id)}
                        className={`hover:bg-gold/10 transition-all cursor-pointer group divide-x divide-gray-200 ${dIdx % 2 === 1 ? 'bg-bg/10' : 'bg-white'}`}
                      >
                        {/* 1. N° Dossier */}
                        <td className="px-3 py-4 text-center text-[0.8rem] font-black text-navy group-hover:text-gold transition-colors">
                          {d.number}
                        </td>
                        
                        {/* 2. Nom Collaborateur - Nettoyé de toute mention RMO */}
                        <td className="px-4 py-4">
                           <span className="text-[0.7rem] font-black text-navy uppercase tracking-tighter truncate max-w-[200px]">
                             {(d.current_holder || 'Non assigné').replace(/^[^-]+ — /, '')}
                           </span>
                        </td>

                        {/* 3. Entreprise */}
                        <td className="px-4 py-4 text-[0.75rem] font-bold text-navy uppercase tracking-tight">
                          {d.entreprise || '---'}
                        </td>

                        {/* 4. Gérant */}
                        <td className="px-4 py-4 text-[0.7rem] font-medium text-navy/70 italic">
                          {d.contact_person || '---'}
                        </td>

                        {/* 5. Téléphone */}
                        <td className="px-3 py-4 text-center text-[0.75rem] font-black text-navy">
                          {d.contact_phone || '---'}
                        </td>

                        {/* 6. Date Instruction */}
                        <td className="px-2 py-4 text-center text-[0.7rem] font-bold text-navy opacity-80">
                          {format(new Date(d.date_instruction), 'dd/MM/yy HH:mm')}
                        </td>

                        {/* 7. Signature ML */}
                        <td className="px-2 py-4 text-center text-[0.7rem] font-black text-emerald-600">
                          {d.date_signature ? format(new Date(d.date_signature), 'dd/MM/yy') : '---'}
                        </td>

                        {/* 8. Échéance */}
                        <td className="px-2 py-4 text-center text-[0.7rem] font-bold text-rose-600">
                          {d.date_echeance ? format(new Date(d.date_echeance), 'dd/MM/yy') : '---'}
                        </td>

                        {/* 9. Délai */}
                        <td className="px-3 py-4 text-center font-serif font-black text-[0.8rem] text-rose-600 italic">
                          {Math.round(d.delai || 0)}h
                        </td>

                        {/* 10. LE RMO */}
                        <td className="px-4 py-4 text-center group-hover:bg-[#1a3a5a] group-hover:text-white transition-colors duration-300">
                          <span className="px-3 py-1 bg-navy/5 rounded-full text-[0.65rem] font-black uppercase tracking-widest border border-navy/10 group-hover:bg-white/10 group-hover:border-white/20">
                            {rmo.code}
                          </span>
                        </td>

                        {/* 11. Observation / Instruction */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                             <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${d.status === 'TRAITE' ? 'bg-emerald-500' : 'bg-gold animate-pulse'}`} />
                                <p className="text-[0.75rem] font-black text-navy uppercase leading-tight line-clamp-1">{d.object}</p>
                             </div>
                             <p className="text-[0.6rem] font-medium text-text-muted italic line-clamp-1 ml-4 border-l-2 border-gold/20 pl-2">
                               {(d as any).last_comment || 'Aucune observation supplémentaire.'}
                             </p>
                          </div>
                        </td>

                        {/* 12. % Collab */}
                        <td className="px-4 py-4 text-center font-black text-emerald-700 text-[0.8rem] bg-emerald-50/20 group-hover:bg-emerald-50 transition-colors">
                          <span className={d.status === 'TRAITE' ? 'text-emerald-600' : 'text-rose-500'}>
                            {d.status === 'TRAITE' || d.status === 'TRAITÉ ET VALIDÉ' ? '100%' : '0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Collaborator Footer Summary - Excel Style - Hidden for ML */}
                    {currentUser.role !== 'ML' && (
                    <tr className="bg-[#d5e3f1] font-black text-navy border-b-2 border-navy/50 shadow-inner">
                      <td colSpan={9} className="border-r border-navy/10"></td>
                      <td colSpan={3} className="px-6 py-3 text-[0.8rem] uppercase italic tracking-tight">
                        <div className="flex items-center justify-between gap-4">
                          <span className="truncate">TOTAL {rmo.name} : {rmoStats?.signed || 0} SIGNÉ(S) ML SUR {rmoStats?.affected || 0} AFFECTÉ(S)</span>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="w-24 h-1.5 bg-white/50 rounded-full overflow-hidden border border-navy/10 hidden xl:block">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${rmoStats?.persPercent || 0}%` }}
                                 className="h-full bg-emerald-500"
                               />
                            </div>
                            <span className="text-emerald-700 min-w-[50px] text-right font-black">{Math.round(rmoStats?.persPercent || 0)},0%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    )}
                  </React.Fragment>
                );
              })}
              
              {filteredDossiers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-32 text-center text-navy/30 bg-slate-50/50">
                    <div className="flex flex-col items-center gap-6">
                       <div className="w-24 h-24 bg-navy/5 rounded-full flex items-center justify-center">
                          <Archive size={48} className="opacity-20" />
                       </div>
                       <div className="space-y-2">
                          <span className="font-serif font-black uppercase tracking-[0.3em] text-sm block">Registre Vacant</span>
                          <p className="text-[0.65rem] font-bold uppercase tracking-widest opacity-60">Aucun dossier actif pour cette sélection dans le Portefeuille Exécutif</p>
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      <DossierModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        user={currentUser}
        rmos={rmos}
        dossier={selectedDossier}
      />

      <AnimatePresence>
        {viewingDossierId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm" onClick={() => setViewingDossierId(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative w-full max-w-5xl h-full max-h-[85vh] z-20"
            >
              <DossierDetailView 
                dossierId={viewingDossierId} 
                user={currentUser} 
                onClose={() => setViewingDossierId(null)} 
                onUpdate={fetchData}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
