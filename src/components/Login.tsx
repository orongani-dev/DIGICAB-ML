import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import LogoMairie from './LogoMairie';
import { api } from '../api';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await api.login({ username, password });
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative backdrop */}
      <div className="absolute inset-0 navy-gradient opacity-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-surface p-10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-2 border-gold/20 relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-navy rounded-full border-4 border-gold flex items-center justify-center shadow-lg">
             <LogoMairie className="w-12 h-12" />
          </div>

          <div className="flex flex-col items-center mt-10 mb-10">
            <h1 className="text-3xl font-serif font-black text-navy text-center uppercase tracking-tighter">DIGICAB-ML</h1>
            <div className="h-1 w-20 bg-gold mt-2 rounded-full" />
            <p className="text-text-muted text-[0.7rem] font-black uppercase tracking-[3px] mt-4 text-center">Cabinet du Maire de Libreville</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-navy uppercase tracking-widest ml-1">Sélectionner un compte</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gold transition-colors z-10" size={20} />
                <select 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 bg-bg border-2 border-border-theme rounded-lg focus:outline-none focus:border-navy transition-all text-navy font-bold text-sm appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>-- Choisir un utilisateur --</option>
                  {Array.isArray(users) && users.map(u => (
                    <option key={u.id} value={u.username}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                    <LogIn size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-navy uppercase tracking-widest ml-1">Clé de sécurité</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gold transition-colors z-10" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-bg border-2 border-border-theme rounded-lg focus:outline-none focus:border-navy transition-all text-navy font-bold text-sm"
                  placeholder="Saisir votre mot de passe..."
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 text-danger p-4 rounded border-l-4 border-danger flex items-center gap-3 text-xs font-black shadow-sm"
              >
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-navy hover:bg-navy-light text-gold font-black py-4 rounded-lg shadow-xl transition-all flex items-center justify-center gap-3 group disabled:opacity-50 uppercase tracking-[4px] text-xs border-b-4 border-navy-light active:border-b-0 active:translate-y-1 mt-4"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gold"></div>
              ) : (
                <>
                  <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                  Accéder au Cabinet
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-6 border-t-2 border-dashed border-border-theme text-center">
            <p className="text-[0.6rem] text-text-muted uppercase tracking-[5px] font-black opacity-40">
              Libreville • Système Unifié v2.2
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
