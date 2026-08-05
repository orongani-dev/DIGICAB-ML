import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Filter, FileText, Download, 
  Calendar, RotateCcw, User as UserIcon, Building2,
  Star, Briefcase, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dossier, RMO, User } from '../types';
import { api } from '../api';
import { cn } from '../lib/utils';

interface AdvancedSearchViewProps {
  user: User;
}

export default function AdvancedSearchView({ user }: AdvancedSearchViewProps) {
  const [rmos, setRmos] = useState<RMO[]>([]);
  const [results, setResults] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    rmoId: '',
    dateStart: '',
    dateEnd: '',
    entreprise: '',
    object: ''
  });

  const isCS = user.role === 'CS-ML'; // Stéphane MANON

  useEffect(() => {
    api.getRMOs().then(setRmos).catch(console.error);
    handleSearch();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await api.advancedSearch(filters);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      status: '',
      rmoId: '',
      dateStart: '',
      dateEnd: '',
      entreprise: '',
      object: ''
    });
    setTimeout(handleSearch, 0);
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-y-auto">
      {/* Header Personnalisé */}
      <div className={cn(
        "flex items-center justify-between p-6 rounded-2xl shadow-xl border-2",
        isCS ? "bg-navy border-gold" : "bg-white border-border-theme"
      )}>
        <div>
          <h2 className={cn(
            "text-3xl font-serif font-black uppercase tracking-tighter",
            isCS ? "text-gold" : "text-navy"
          )}>
            {isCS ? "Console de Haute Décision • CS-ML" : "Recherche Stratégique & Rapports"}
          </h2>
          <p className={cn(
            "text-[0.7rem] font-bold uppercase tracking-[4px] mt-1",
            isCS ? "text-gold/60" : "text-text-muted"
          )}>
             {isCS ? `Monsieur Stéphane MANON - Conseiller Spécial du Maire` : `Cabinet du Maire de Libreville • Accès Décideur`}
          </p>
        </div>
        {isCS && <Zap className="text-gold animate-pulse" size={32} />}
      </div>

      {/* Barre de Recherche Avancée */}
      <form onSubmit={handleSearch} className="bg-surface p-6 rounded-xl border border-border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Star size={10} className="text-gold" /> Statut
            </label>
            <select 
              className="w-full bg-bg border border-border-theme p-2 rounded text-xs font-bold focus:ring-2 focus:ring-navy/5"
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Tous les statuts</option>
              <option value="EN_COURS">En cours d'instruction</option>
              <option value="TRAITÉ ET VALIDÉ">Signés par le Maire</option>
              <option value="SUSPENDU">Suspendus</option>
              <option value="REJETE">Rejetés</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Briefcase size={10} className="text-gold" /> Unité (RMO)
            </label>
            <select 
              className="w-full bg-bg border border-border-theme p-2 rounded text-xs font-bold focus:ring-2 focus:ring-navy/5"
              value={filters.rmoId}
              onChange={e => setFilters({...filters, rmoId: e.target.value})}
            >
              <option value="">Toutes les unités</option>
              {rmos.map(r => (
                <option key={r.id} value={r.id}>{r.code} - {r.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Building2 size={10} className="text-gold" /> Entreprise
            </label>
            <input 
              type="text" 
              placeholder="Ex: SEEG, Orabank..."
              className="w-full bg-bg border border-border-theme p-2 rounded text-xs font-bold focus:ring-2 focus:ring-navy/5"
              value={filters.entreprise}
              onChange={e => setFilters({...filters, entreprise: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} className="text-gold" /> Du
            </label>
            <input 
              type="date" 
              className="w-full bg-bg border border-border-theme p-2 rounded text-xs font-bold focus:ring-2 focus:ring-navy/5"
              value={filters.dateStart}
              onChange={e => setFilters({...filters, dateStart: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} className="text-gold" /> Au
            </label>
            <input 
              type="date" 
              className="w-full bg-bg border border-border-theme p-2 rounded text-xs font-bold focus:ring-2 focus:ring-navy/5"
              value={filters.dateEnd}
              onChange={e => setFilters({...filters, dateEnd: e.target.value})}
            />
          </div>

          <div className="flex items-end gap-2">
            <button 
              type="submit"
              className="flex-1 bg-navy text-gold p-2.5 rounded-lg font-black text-[0.65rem] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-navy-light transition-all shadow-md"
            >
              <Search size={14} /> Filtrer
            </button>
            <button 
              type="button"
              onClick={handleReset}
              className="bg-bg text-navy p-2.5 rounded-lg border border-border-theme hover:bg-gold/10 transition-all"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </form>

      {/* Résultats - Haute Densité */}
      <div className="flex-1 bg-surface rounded-xl border border-border-theme shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-bg/50 border-b border-border-theme flex items-center justify-between">
          <span className="text-[0.65rem] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
            <FileText size={14} className="text-navy" /> {results.length} Dossiers Identifiés
          </span>
          <button className="text-[0.65rem] font-black text-navy uppercase tracking-widest flex items-center gap-1 bg-gold/20 px-3 py-1.5 rounded-full border border-gold/30 hover:bg-gold/40 transition-all">
            <Download size={14} /> Exporter Rapport
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border-theme">
              <tr>
                <th className="px-4 py-3 text-[0.65rem] font-black text-text-muted uppercase tracking-[3px]">N° CAB</th>
                <th className="px-4 py-3 text-[0.65rem] font-black text-text-muted uppercase tracking-[3px]">Entité/Entreprise</th>
                <th className="px-4 py-3 text-[0.65rem] font-black text-text-muted uppercase tracking-[3px]">Objet Stratégique</th>
                <th className="px-4 py-3 text-[0.65rem] font-black text-text-muted uppercase tracking-[3px]">Unité RMO</th>
                <th className="px-4 py-3 text-[0.65rem] font-black text-text-muted uppercase tracking-[3px]">Statut</th>
                <th className="px-4 py-3 text-[0.65rem] font-black text-text-muted uppercase tracking-[3px]">Délai (H.O)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-theme/50">
              {results.map((d, idx) => (
                <tr key={d.id} className={cn(
                  "hover:bg-gold/5 transition-all text-xs font-bold",
                  idx % 2 === 1 ? "bg-bg/20" : "bg-white"
                )}>
                  <td className="px-4 py-3 text-navy font-black">{d.number}</td>
                  <td className="px-4 py-3 uppercase text-navy/70 italic">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} className="text-gold" /> {d.entreprise || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className="line-clamp-1 uppercase tracking-tight text-navy">{d.object}</p>
                    <span className="text-[0.6rem] font-bold text-text-muted flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> Instruction : {format(new Date(d.date_instruction), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-navy text-gold px-1.5 py-0.5 rounded text-[0.6rem] font-black">{d.rmo_code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded text-[0.6rem] font-black uppercase tracking-tighter border",
                      d.status === 'TRAITÉ ET VALIDÉ' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      d.status === 'REJETE' ? "bg-rose-50 text-rose-700 border-rose-200" :
                      "bg-slate-50 text-slate-600 border-slate-200"
                    )}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded font-black",
                      (d.delai || 0) > 48 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {Math.round(d.delai || 0)}h
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
