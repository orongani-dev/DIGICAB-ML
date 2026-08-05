import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, Users, BarChart3, TrendingUp, 
  Search, ArrowDown, ArrowUp, Activity
} from 'lucide-react';
import { api } from '../api';
import { SessionStats } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';

export default function SessionStatsView() {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRange, setActiveRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getSessionStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentData = stats ? stats[activeRange] : [];

  if (loading) return <div className="flex items-center justify-center p-20"><Activity className="animate-spin text-gold" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-border-theme shadow-sm">
            <p className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest mb-1">Total Connexion (Mois)</p>
            <div className="flex items-end justify-between">
               <h4 className="text-3xl font-serif font-black text-navy uppercase tracking-tighter">
                  {stats?.monthly[0]?.total || 0} <span className="text-sm">min</span>
               </h4>
               <TrendingUp className="text-emerald-500" size={24} />
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-border-theme shadow-sm">
            <p className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest mb-1">Sessions Actives (Jour)</p>
            <div className="flex items-end justify-between">
               <h4 className="text-3xl font-serif font-black text-navy uppercase tracking-tighter">
                  {stats?.daily[0]?.count || 0}
               </h4>
               <Users className="text-gold" size={24} />
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-border-theme shadow-sm">
            <p className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest mb-1">Moyenne / Session</p>
            <div className="flex items-end justify-between">
               <h4 className="text-3xl font-serif font-black text-navy uppercase tracking-tighter">
                  {stats?.daily[0] ? Math.round(stats.daily[0].total / stats.daily[0].count) : 0} <span className="text-sm">min</span>
               </h4>
               <Clock className="text-navy" size={24} />
            </div>
         </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-border-theme shadow-lg">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter">Flux de Présence Digitale</h3>
               <p className="text-[0.65rem] font-bold text-text-muted uppercase tracking-widest">Analyse temporelle des connexions</p>
            </div>
            <div className="flex gap-2 p-1 bg-bg rounded-xl">
               {(['daily', 'weekly', 'monthly'] as const).map(range => (
                 <button
                   key={range}
                   onClick={() => setActiveRange(range)}
                   className={`px-4 py-2 rounded-lg text-[0.65rem] font-black uppercase tracking-widest transition-all ${
                     activeRange === range ? 'bg-navy text-gold shadow-md' : 'text-text-muted hover:bg-white'
                   }`}
                 >
                   {range === 'daily' ? 'Journalier' : range === 'weekly' ? 'Hebdo' : 'Mensuel'}
                 </button>
               ))}
            </div>
         </div>

         <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={[...currentData].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'rgba(196, 150, 68, 0.1)' }}
                  />
                  <Bar dataKey="total" fill="#1e293b" radius={[4, 4, 0, 0]} name="Minutes de Connexion" />
                  <Bar dataKey="count" fill="#c49644" radius={[4, 4, 0, 0]} name="Nombre de Sessions" />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-border-theme shadow-lg">
         <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter mb-6">Classement Engagement par Membre</h3>
         <div className="space-y-4">
            {stats?.userStats.map((u, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-bg rounded-xl border border-border-theme">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-navy text-gold flex items-center justify-center font-black text-xs">
                       {i + 1}
                    </div>
                    <div>
                       <p className="text-sm font-black text-navy uppercase">{u.name}</p>
                       <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-widest">{u.sessions} Sessions accomplies</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-lg font-serif font-black text-navy">{u.total} <span className="text-[0.6rem]">min</span></p>
                    <div className="w-32 h-1.5 bg-border-theme rounded-full mt-1 overflow-hidden">
                       <div 
                         className="h-full bg-gold" 
                         style={{ width: `${Math.min(100, (u.total / (stats.userStats[0]?.total || 1)) * 100)}%` }} 
                       />
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
