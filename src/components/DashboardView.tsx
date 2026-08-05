import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  FileText,
  Users
} from 'lucide-react';
import { api } from '../api';
import { PortfolioKPIs, Dossier } from '../types';
import StatCard from './StatCard';
import LogoMairie from './LogoMairie';

export default function DashboardView({ settings }: { settings?: any }) {
  const [kpis, setKpis] = useState<PortfolioKPIs | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('digicab_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiData, dossierData] = await Promise.all([
        api.getPortfolioKPIs(),
        api.getDossiers()
      ]);
      
      const savedUser = JSON.parse(localStorage.getItem('digicab_user') || '{}');
      if (savedUser.role === 'ML') {
        // Standard user sees only his dossiers
        const myDossiers = (dossierData || []).filter(d => d.created_by === savedUser.id);
        setDossiers(myDossiers);
        
        // Recalculate KPIs based on his dossiers
        const traite = (myDossiers || []).filter(d => ['TRAITÉ ET VALIDÉ', 'TRAITE'].includes(d.status)).length;
        const actifs = (myDossiers || []).filter(d => !['ARCHIVE', 'ANNULE', 'SUSPENDU'].includes(d.status)).length;
        
        setKpis({
          ...kpiData,
          global: {
            ...(kpiData?.global || {}),
            active: actifs,
            signed: traite,
            conversionRate: actifs > 0 ? (traite / actifs) * 100 : 0
          }
        });
      } else {
        setKpis(kpiData);
        setDossiers(dossierData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isStandard = currentUser?.role === 'ML';
  const isDecisionMaker = ['ADMIN', 'MAIRE', 'SP-ML', 'DC-ML', 'SC-ML', 'CS-ML', 'CTML', 'RESPONSABLE'].includes(currentUser?.role || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  const traiteCount = (dossiers || []).filter(d => ['TRAITÉ ET VALIDÉ', 'TRAITE'].includes(d.status)).length;
  const enCoursCount = (dossiers || []).filter(d => ['EN_COURS', 'EN_ATTENTE_SIGNATURE'].includes(d.status)).length;
  const enSoufranceCount = (dossiers || []).filter(d => !['TRAITÉ ET VALIDÉ', 'TRAITE', 'ARCHIVE', 'ANNULE', 'SUSPENDU', 'REJETE'].includes(d.status) && (d.delai || 0) > 48).length;
  const totalActifs = (dossiers || []).filter(d => !['ARCHIVE', 'ANNULE', 'SUSPENDU'].includes(d.status)).length;
  const stats = [
    { 
      label: 'Dossiers Traités / Signés', 
      count: traiteCount, 
      percent: totalActifs > 0 ? (traiteCount / totalActifs) * 100 : 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      filter: 'TRAITE'
    },
    { 
      label: 'Dossiers en Cours d\'Instruction', 
      count: enCoursCount, 
      percent: totalActifs > 0 ? (enCoursCount / totalActifs) * 100 : 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      filter: 'EN_COURS'
    },
    { 
      label: 'Dossiers en Souffrance (>48h)', 
      count: enSoufranceCount, 
      percent: totalActifs > 0 ? (enSoufranceCount / totalActifs) * 100 : 0,
      icon: AlertCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      filter: 'SOUFFRANCE'
    },
    { 
      label: 'Total Dossiers Actifs', 
      count: totalActifs, 
      percent: 100,
      icon: FileText,
      color: 'text-navy',
      bg: 'bg-slate-50',
      filter: 'ACTIFS'
    }
  ];

  const handleCardClick = (filter: string) => {
    // Navigate to portfolio with filter (if parent handles it via state or storage)
    localStorage.setItem('portfolio_filter', filter);
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'portfolio' }));
  };

  return (
    <div className="p-6 space-y-8 relative">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
         <LogoMairie className="w-[800px] h-[800px] grayscale" />
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-serif font-black text-navy uppercase tracking-tighter">
             {settings?.app_name || 'DIGICAB ML'}
          </h2>
          <p className="text-[0.7rem] font-bold text-text-muted uppercase tracking-[4px] mt-1">
             {settings?.dash_subtitle || 'Vue d\'ensemble de la performance opérationnelle du cabinet'}
          </p>
        </div>
        <div className="bg-navy p-4 rounded-xl border-2 border-gold flex items-center gap-6 shadow-xl relative overflow-hidden group">
           <div className="absolute inset-0 bg-gold/5 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
           <div className="relative z-10">
              <p className="text-white font-black text-2xl leading-none">{Math.round(kpis?.global?.conversionRate || 0)}%</p>
              <p className="text-gold/60 text-[0.6rem] font-bold uppercase tracking-widest mt-1">Taux de Signature Global</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleCardClick(stat.filter)}
            className="bg-white p-6 rounded-2xl border-2 border-border-theme shadow-lg hover:shadow-xl transition-all group cursor-pointer hover:border-gold hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-4xl font-serif font-black text-navy group-hover:text-gold transition-colors">{stat.count}</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-1 h-3 rounded-full ${stat.color.replace('text-', 'bg-')}`} />
                   <h3 className="text-navy font-black text-[0.7rem] uppercase tracking-widest">{stat.label}</h3>
                </div>
              </div>
              <span className={`text-sm font-black ${stat.color} opacity-60`}>{Math.round(stat.percent)}%</span>
            </div>
            <div className="mt-4 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${stat.percent}%` }}
                 className={`h-full ${stat.color.replace('text-', 'bg-')}`}
               />
            </div>
          </motion.div>
        ))}
      </div>

      {!isDecisionMaker ? null : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <div className="bg-navy p-8 rounded-3xl border-4 border-gold shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -mr-32 -mt-32" />
          <h3 className="text-gold text-xl font-serif font-black uppercase tracking-tighter mb-6">
             Performance par Unité Responsable
          </h3>
          <div className="space-y-4">
            {(kpis?.rmoStats || []).slice(0, 5).map((stat, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-white font-black text-xs uppercase tracking-[2px]">{stat.rmoCode} - {stat.affected} Dossiers</span>
                  <span className="text-gold font-black text-sm">{Math.round(stat.persPercent)}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.persPercent}%` }}
                    className="h-full bg-[linear-gradient(90deg,var(--color-gold),#fff)] shadow-[0_0_10px_rgba(196,150,68,0.5)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Overview Section */}
        <div className="bg-surface p-8 rounded-3xl border-2 border-border-theme shadow-xl flex flex-col justify-between">
           <div>
              <h3 className="text-navy text-xl font-serif font-black uppercase tracking-tighter mb-2">État de Situation Cabinet</h3>
              <p className="text-text-muted text-[0.7rem] font-bold uppercase tracking-[2px] mb-8">Analyse en temps réel des flux de dossiers</p>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-bg rounded-2xl border border-border-theme">
                    <p className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest mb-1">Délai Moyen / Dossier</p>
                    <p className="text-2xl font-black text-navy">{Math.round(kpis?.global?.avgDelay || 0)} Heures</p>
                 </div>
                 <div className="p-4 bg-bg rounded-2xl border border-border-theme">
                    <p className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest mb-1">Total Collaborateurs</p>
                    <p className="text-2xl font-black text-navy">{new Set((dossiers || []).map(d => d.current_holder)).size}</p>
                 </div>
              </div>
           </div>

           <div className="mt-8 p-6 bg-navy rounded-2xl border-b-4 border-gold shadow-lg">
              <div className="flex items-center gap-6">
                 <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest">Alerte de Supervision</h4>
                    <p className="text-gold/80 text-[0.7rem] font-medium leading-tight mt-1">
                      {enSoufranceCount > 0 
                        ? `Attention : ${enSoufranceCount} dossiers dépassent le délai critique de 48h opérationnelles.` 
                        : "Félicitations : Tous les dossiers actifs sont dans les délais de traitement standard."}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      )}

      {/* Detailed Table - Hidden for standard members */}
      {isDecisionMaker && (
      <div className="bg-white rounded-3xl border-2 border-border-theme shadow-xl overflow-hidden">
         <div className="p-6 bg-navy text-gold flex items-center justify-between border-b border-gold/30">
            <h3 className="text-xl font-serif font-black uppercase tracking-tighter">Suivi Détaillé par Unité</h3>
            <span className="text-[0.6rem] font-bold uppercase tracking-widest bg-gold/10 px-3 py-1 rounded-full border border-gold/20 text-gold">Dernière mise à jour : {new Date().toLocaleTimeString()}</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-bg/50 border-b border-border-theme">
                  <tr>
                     <th className="px-6 py-4 text-[0.6rem] font-black text-navy uppercase tracking-widest border-r border-border-theme/20">Direction / Unité</th>
                     <th className="px-6 py-4 text-[0.6rem] font-black text-navy uppercase tracking-widest border-r border-border-theme/20 text-right">Traités</th>
                     <th className="px-6 py-4 text-[0.6rem] font-black text-navy uppercase tracking-widest border-r border-border-theme/20 text-right">En Cours</th>
                     <th className="px-6 py-4 text-[0.6rem] font-black text-navy uppercase tracking-widest border-r border-border-theme/20 text-right">Signature</th>
                     <th className="px-6 py-4 text-[0.6rem] font-black text-navy uppercase tracking-widest border-r border-border-theme/20 text-right text-rose-600">Retard</th>
                     <th className="px-6 py-4 text-[0.6rem] font-black text-navy uppercase tracking-widest text-center">Progression</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border-theme/50">
                  {(kpis?.rmoStats || []).map((stat, i) => {
                    const rmoDossiers = (dossiers || []).filter(d => d.rmo_code === stat.rmoCode);
                    const traite = (rmoDossiers || []).filter(d => ['TRAITÉ ET VALIDÉ', 'TRAITE'].includes(d.status)).length;
                    const enCours = (rmoDossiers || []).filter(d => d.status === 'EN_COURS').length;
                    const signature = (rmoDossiers || []).filter(d => d.status === 'EN_ATTENTE_SIGNATURE').length;
                    const retard = (rmoDossiers || []).filter(d => !['TRAITÉ ET VALIDÉ', 'TRAITE'].includes(d.status) && (d.delai || 0) > 48).length;
                    
                    return (
                      <tr key={i} className="hover:bg-gold/5 transition-all group">
                         <td className="px-6 py-4 border-r border-border-theme/20">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-navy text-gold rounded flex items-center justify-center font-black text-[0.6rem]">
                                  {stat.rmoCode}
                               </div>
                               <span className="text-xs font-black text-navy uppercase">{stat.rmoName}</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-right font-bold text-xs text-emerald-600 border-r border-border-theme/20">{traite}</td>
                         <td className="px-6 py-4 text-right font-bold text-xs text-navy border-r border-border-theme/20">{enCours}</td>
                         <td className="px-6 py-4 text-right font-bold text-xs text-blue-600 border-r border-border-theme/20">{signature}</td>
                         <td className="px-6 py-4 text-right font-bold text-xs text-rose-600 border-r border-border-theme/20">{retard}</td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-3 justify-center">
                               <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-navy" style={{ width: `${stat.persPercent}%` }} />
                               </div>
                               <span className="text-[0.6rem] font-black text-navy">{Math.round(stat.persPercent)}%</span>
                            </div>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>
      )}
    </div>
  );
}
