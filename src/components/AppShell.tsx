import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Briefcase, 
  PieChart, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Users, 
  FileText, 
  History,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import LogoMairie from './LogoMairie';
import { User } from '../types';

interface AppShellProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  appName?: string;
  mairieName?: string;
  settings?: any;
}

export default function AppShell({ user, onLogout, activeTab, setActiveTab, children, appName, mairieName, settings }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  useEffect(() => {
    const handleSwitch = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('switch-tab', handleSwitch);
    return () => window.removeEventListener('switch-tab', handleSwitch);
  }, [setActiveTab]);

  const isDecisionMaker = ['ADMIN', 'MAIRE', 'SP-ML', 'DC-ML', 'SC-ML', 'CS-ML', 'CTML', 'RESPONSABLE'].includes(user.role);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portefeuille Exécutif', icon: PieChart },
    ...(isDecisionMaker ? [
      { id: 'search', label: 'Recherche Stratégique', icon: Search },
      { id: 'users', label: 'Gouvernance & Habilitations', icon: ShieldCheck }
    ] : []),
    { id: 'dossiers', label: 'Dossiers Cabinet', icon: Briefcase },
    { id: 'comite', label: 'Comités', icon: Users },
    { id: 'rapports', label: 'Rapports & Logs', icon: FileText },
    ...(user.role === 'ADMIN' ? [{ id: 'admin', label: 'Administration', icon: Settings }] : []),
  ];

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 80 }}
        className="bg-navy text-white flex flex-col z-50 relative border-right-2 border-gold"
        style={{ borderRight: isSidebarOpen ? '2px solid var(--color-gold)' : 'none' }}
      >
        <div className="p-6 border-b border-white/10 flex flex-col items-center gap-3">
          <LogoMairie className={isSidebarOpen ? "w-16 h-16" : "w-10 h-10"} />
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center"
            >
              <h1 className="font-serif font-bold text-lg leading-tight text-gold tracking-wider">{appName || 'DIGICAB-ML'}</h1>
              <span className="text-[0.65rem] uppercase opacity-70 tracking-[2px] font-bold">{mairieName || 'Cabinet du Maire'}</span>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-all relative text-sm border-l-4 ${
                activeTab === item.id 
                  ? 'bg-white/5 text-white border-gold' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white border-transparent'
              }`}
            >
              <item.icon size={18} className="shrink-0" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          {isSidebarOpen && (
            <div className="text-[0.7rem] text-gold mb-4 font-black tracking-widest uppercase animate-pulse">
              V2.3-CAB EDITION • LIVE
            </div>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-rose-300 hover:bg-rose-500/10 transition-all text-xs font-bold uppercase tracking-wider"
          >
            <LogOut size={16} className="shrink-0" />
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden h-full">
        {/* Top Header */}
        <header className="h-[64px] bg-surface border-b border-border-theme px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-bg rounded-lg text-text-muted"
            >
              {isSidebarOpen ? <Menu size={20} /> : <X size={20} />}
            </button>
            <div className="text-[0.85rem] text-text-muted">
              Cabinet / <strong className="text-navy">{menuItems.find(item => item.id === activeTab)?.label || 'Portefeuille Exécutif'}</strong>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[0.85rem] font-semibold text-navy leading-none">{user.name}</p>
                <p className="text-[0.7rem] text-text-muted mt-1 uppercase tracking-wider">Connecté ({user.role === 'ML' ? 'Membre CAB-ML' : user.role})</p>
              </div>
              <div className="relative group">
                <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-navy font-black text-sm ring-4 ring-gold/10 cursor-pointer hover:ring-gold/30 transition-all">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
                {/* Profile Popup on Hover */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-border-theme opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] transform translate-y-2 group-hover:translate-y-0">
                  <div className="p-4 border-b border-border-theme bg-bg/50 rounded-t-xl">
                    <p className="text-xs font-black text-navy uppercase truncate">{user.name}</p>
                    <p className="text-[0.6rem] text-text-muted font-bold uppercase tracking-widest">{user.role === 'ML' ? 'Membre CAB-ML' : user.role}</p>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 transition-colors text-xs font-black uppercase tracking-widest rounded-b-xl"
                  >
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View */}
        <div className="flex-1 overflow-y-auto bg-bg custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
