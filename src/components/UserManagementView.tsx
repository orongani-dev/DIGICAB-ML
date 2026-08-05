import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Shield, ShieldAlert, CheckCircle2, XCircle, 
  Settings2, Save, UserCheck, UserX, Star, Zap, UserPlus, X,
  Eye, EyeOff
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { User } from '../types';
import { api } from '../api';
import { cn } from '../lib/utils';

interface UserManagementViewProps {
  currentUser: User;
}

export default function UserManagementView({ currentUser }: UserManagementViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formPermissions, setFormPermissions] = useState<any>({});
  const [formActive, setFormActive] = useState(true);
  const [formIsResponsible, setFormIsResponsible] = useState(false);
  const [formRole, setFormRole] = useState('');
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');

  const canManage = currentUser.role === 'ADMIN' || currentUser.role === 'ML';
  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'STANDARD' });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setIsAddModalOpen(false);
      setNewUser({ username: '', password: '', name: '', role: 'STANDARD' });
      loadUsers();
    } catch (error: any) {
      alert(error.message || "Erreur lors de la création");
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    
    let parsedPermissions = {
      can_view_dossiers: true,
      can_edit_dossiers: false,
      can_view_reports: false,
      can_manage_users: false,
      can_access_params: false,
      can_use_chat: true,
      can_create_committees: false,
      can_manage_rmo: false
    };

    if (user.permissions) {
      try {
        const p = JSON.parse(user.permissions);
        parsedPermissions = { ...parsedPermissions, ...p };
      } catch (e) {
        console.error("Invalid permissions JSON for user:", user.username);
      }
    }

    setFormPermissions(parsedPermissions);
    setFormActive(user.is_active);
    setFormIsResponsible(user.is_responsible || false);
    setFormRole(user.role);
    setFormName(user.name);
    setFormUsername(user.username);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) return;
    try {
      await api.deleteUser(userId);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      alert(error.message || "Erreur lors de la suppression");
    }
  };

  const handleResetPassword = async (userId: number) => {
    const newPassword = prompt("Entrez le nouveau mot de passe :");
    if (!newPassword || newPassword.length < 4) {
      alert("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }
    try {
      await api.resetPassword(userId, newPassword);
      alert("Mot de passe réinitialisé avec succès.");
    } catch (error) {
      alert("Erreur lors de la réinitialisation.");
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await api.updateUserPermissions(selectedUser.id, {
        permissions: formPermissions,
        is_active: formActive,
        role: formRole,
        is_responsible: formRole === 'RESPONSABLE' || formRole === 'CTML' || formIsResponsible,
        name: formName,
        username: formUsername
      });
      await loadUsers();
      setSelectedUser(null);
    } catch (error: any) {
      alert(error.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const permissionLabels: Record<string, string> = {
    can_view_dossiers: "Accès Lecture Dossiers",
    can_edit_dossiers: "Droit de Modification / Action",
    can_view_reports: "Accès Rapports Stratégiques",
    can_manage_users: "Gouvernance des Utilisateurs",
    can_access_params: "Configuration Système",
    can_use_chat: "Accès Messagerie Cabinet",
    can_create_committees: "Gestion des Comités",
    can_manage_rmo: "Supervision des Unités (RMO)"
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="bg-navy p-6 rounded-2xl shadow-xl border-2 border-gold flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-black text-gold uppercase tracking-tighter">
            Gouvernance & Habilitations • V2.2
          </h2>
          <p className="text-[0.7rem] font-bold text-gold/60 uppercase tracking-[4px] mt-1">
            Contrôle des Accès du Cabinet du Maire de Libreville
          </p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="bg-gold text-navy px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gold/90 transition-all shadow-lg"
           >
              <UserPlus size={18} /> Nouveau Membre
           </button>
           <Shield size={32} className="text-gold animate-pulse" />
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* User List */}
        <div className="w-1/2 bg-surface rounded-xl border border-border-theme shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-bg/50 border-b border-border-theme flex items-center justify-between">
            <span className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-navy" /> Effectif du Cabinet ({users.length})
            </span>
          </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border-theme">
                  <tr>
                    <th className="px-4 py-3 text-[0.6rem] font-black text-text-muted uppercase tracking-widest">Membre</th>
                    <th className="px-4 py-3 text-[0.6rem] font-black text-text-muted uppercase tracking-widest">Rôle</th>
                    <th className="px-4 py-3 text-[0.6rem] font-black text-text-muted uppercase tracking-widest">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-theme/50">
                  {Array.isArray(users) && users.map(user => (
                    <tr 
                      key={user.id} 
                      onClick={() => handleSelectUser(user)}
                      className={cn(
                        "cursor-pointer transition-all hover:bg-gold/5",
                        selectedUser?.id === user.id ? "bg-gold/10" : "bg-white"
                      )}
                    >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-navy font-black text-xs border border-navy/20">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-[0.6rem] font-bold text-text-muted mb-1">@{user.username}</p>
                          <p className="text-xs font-black text-navy uppercase leading-none">{user.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-navy text-gold px-1.5 py-0.5 rounded text-[0.6rem] font-black uppercase">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <XCircle size={16} className="text-rose-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="flex-1 bg-surface rounded-xl border border-border-theme shadow-sm flex flex-col overflow-hidden">
          {selectedUser ? (
            <div className="p-8 space-y-8 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-black text-navy uppercase tracking-tighter flex items-center gap-2">
                    <Settings2 className="text-gold" /> Configurer {selectedUser.name}
                  </h3>
                  <p className="text-[0.7rem] font-bold text-text-muted uppercase tracking-[2px] mt-1">
                    Mode {isAdmin ? "Administration Totale" : "Conformité CAB-ML"}
                  </p>
                </div>
                {selectedUser.username === 'admin' && (
                  <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full border border-rose-200 animate-bounce">
                    <ShieldAlert size={14} />
                    <span className="text-[0.6rem] font-black uppercase tracking-widest">Immuable</span>
                  </div>
                )}
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {/* Name & Username Edit */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-bg/50 rounded-xl border border-border-theme space-y-2">
                    <p className="text-[0.65rem] font-black text-navy uppercase">Nom Complet</p>
                    <input 
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      disabled={!isAdmin}
                      className="w-full bg-white border border-border-theme rounded-lg px-2 py-1.5 text-[0.65rem] font-bold text-navy outline-none"
                    />
                  </div>
                  <div className="p-4 bg-bg/50 rounded-xl border border-border-theme space-y-2">
                    <p className="text-[0.65rem] font-black text-navy uppercase">Identifiant (Username)</p>
                    <input 
                      type="text"
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      disabled={selectedUser.username === 'admin' || !isAdmin}
                      className="w-full bg-white border border-border-theme rounded-lg px-2 py-1.5 text-[0.65rem] font-bold text-navy outline-none"
                    />
                  </div>
                </div>

                {/* Status & Role Toggle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-bg/50 rounded-xl border border-border-theme flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-navy uppercase">Statut</p>
                    </div>
                    <button 
                      disabled={selectedUser.username === 'admin' || !isAdmin}
                      onClick={() => setFormActive(!formActive)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[0.65rem] uppercase tracking-widest transition-all",
                        formActive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
                        (selectedUser.username === 'admin' || !isAdmin) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {formActive ? "Actif" : "Suspendu"}
                    </button>
                  </div>

                  <div className="p-4 bg-bg/50 rounded-xl border border-border-theme space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[0.65rem] font-black text-navy uppercase">Rôle</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formIsResponsible || formRole === 'RESPONSABLE'} 
                          onChange={(e) => setFormIsResponsible(e.target.checked)}
                          className="w-3 h-3 accent-gold"
                        />
                        <span className="text-[0.55rem] font-black text-navy uppercase">Droits Étendus</span>
                      </label>
                    </div>
                    <select 
                      disabled={selectedUser.username === 'admin' || !isAdmin}
                      value={formRole}
                      onChange={e => {
                        setFormRole(e.target.value);
                        if (e.target.value === 'RESPONSABLE') setFormIsResponsible(true);
                      }}
                      className="w-full bg-white border border-border-theme rounded-lg px-2 py-1.5 text-[0.65rem] font-bold text-navy outline-none"
                    >
                      <option value="ML">Membre CAB-ML</option>
                      <option value="STANDARD">Membre Standard</option>
                      <option value="RESPONSABLE">Responsable Unité</option>
                      <option value="SPECIAL">Conseiller Spécial</option>
                      <option value="EXTERIEUR">Intervenant Extérieur</option>
                      <option value="CTML">Chef de Cabinet (CTML)</option>
                    </select>
                  </div>
                </div>

                {/* Granular Permissions */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-gold" /> Fonctionnalités Activées
                  </div>
                  {Object.keys(permissionLabels).map(key => (
                    <div 
                      key={key}
                      onClick={() => {
                        if (selectedUser.username !== 'admin' && isAdmin) {
                          setFormPermissions({ ...formPermissions, [key]: !formPermissions[key] });
                        }
                      }}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer",
                        formPermissions[key] ? "bg-gold/5 border-gold shadow-sm" : "bg-bg border-border-theme",
                        (selectedUser.username === 'admin' || !isAdmin) && "cursor-not-allowed"
                      )}
                    >
                      <span className="text-xs font-bold text-navy uppercase">{permissionLabels[key]}</span>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        formPermissions[key] ? "text-gold" : "text-text-muted opacity-30"
                      )}>
                        {formPermissions[key] ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Password Reset Section */}
                {selectedUser.username !== 'admin' && isAdmin && (
                  <div className="p-6 bg-rose-50 rounded-2xl border-2 border-rose-200 mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="text-rose-600" size={20} />
                      <h4 className="text-[0.65rem] font-black text-rose-900 uppercase tracking-widest">Zone de sécurité : Réinitialisation</h4>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        id="new-password-input"
                        type="password"
                        placeholder="Nouveau mot de passe"
                        className="flex-1 bg-white border border-rose-200 rounded-lg px-4 py-2 font-bold text-navy text-xs outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button 
                        onClick={async () => {
                          const input = document.getElementById('new-password-input') as HTMLInputElement;
                          const val = input.value;
                          if (val.length < 4) {
                            alert("Minimum 4 caractères");
                            return;
                          }
                          try {
                            setLoading(true);
                            await api.resetPassword(selectedUser.id, val);
                            alert("Mot de passe mis à jour !");
                            input.value = '';
                          } catch (e) {
                            alert("Erreur serveur");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="bg-rose-600 text-white px-6 py-2 rounded-lg font-black text-[0.6rem] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md disabled:opacity-50"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border-theme flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {selectedUser.username !== 'admin' && isAdmin && (
                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleDeleteUser(selectedUser.id)}
                         className="bg-rose-500 text-white px-6 py-3 rounded-xl font-black text-[0.6rem] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg"
                       >
                         Supprimer l'utilisateur
                       </button>
                    </div>
                  )}
                  <p className="text-[0.6rem] font-bold text-text-muted italic max-w-sm">
                    * Conformément aux directives du CAB-ML, seul l'Administrateur peut ordonner ces changements structurels.
                  </p>
                </div>
                <button 
                  onClick={handleSave}
                  disabled={loading || selectedUser.username === 'admin' || !isAdmin}
                  className="bg-navy text-gold px-8 py-3 rounded-xl font-black text-[0.7rem] uppercase tracking-[4px] flex items-center gap-3 hover:bg-navy-light transition-all shadow-xl disabled:opacity-50 disabled:grayscale"
                >
                  <Save size={18} /> Appliquer les Changements
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <Shield size={64} className="text-navy opacity-5 mb-2" />
              <h3 className="text-2xl font-serif font-black text-navy/20 uppercase tracking-tighter">Sélectionnez un Membre</h3>
              <p className="text-[0.7rem] font-bold text-text-muted uppercase tracking-[3px] max-w-xs">
                Accédez à la console de gestion des habilitations pour modifier les privilèges.
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-navy/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-b-4 border-gold"
             >
                <div className="bg-navy p-6 flex justify-between items-center bg-[radial-gradient(circle_at_top_right,rgba(196,150,68,0.2),transparent)]">
                   <div>
                      <h3 className="text-xl font-serif font-black text-gold uppercase tracking-tighter">Accréditer un Nouveau Membre</h3>
                      <p className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-widest mt-1">Génération d'identifiants CAB-ML</p>
                   </div>
                   <button onClick={() => setIsAddModalOpen(false)} className="text-gold/60 hover:text-gold transition-colors">
                      <X size={24} />
                   </button>
                </div>
                
                <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                   <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest">Nom Complet</label>
                      <input 
                        required
                        type="text"
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                        className="w-full bg-bg border border-border-theme rounded-xl px-4 py-3 font-bold text-navy focus:ring-2 focus:ring-gold outline-none"
                        placeholder="Ex: Jean Dupont"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest">Identifiant (Username)</label>
                      <input 
                        required
                        type="text"
                        value={newUser.username}
                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                        className="w-full bg-bg border border-border-theme rounded-xl px-4 py-3 font-bold text-navy focus:ring-2 focus:ring-gold outline-none"
                        placeholder="jdupont"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest">Mot de Passe Provisoire</label>
                      <div className="relative">
                        <input 
                          required
                          type={showPassword && isAdmin ? "text" : "password"}
                          value={newUser.password}
                          onChange={e => setNewUser({...newUser, password: e.target.value})}
                          className="w-full bg-bg border border-border-theme rounded-xl px-4 py-3 font-bold text-navy focus:ring-2 focus:ring-gold outline-none"
                        />
                        {isAdmin && (
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        )}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[0.65rem] font-black text-navy uppercase tracking-widest">Rôle Utilisateur</label>
                      <select 
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                        className="w-full bg-bg border border-border-theme rounded-xl px-4 py-3 font-bold text-navy focus:ring-2 focus:ring-gold outline-none"
                      >
                         <option value="ML">Membre CAB-ML</option>
                         <option value="STANDARD">Membre Standard</option>
                         <option value="RESPONSABLE">Responsable Unité</option>
                         <option value="SPECIAL">Conseiller Spécial</option>
                         <option value="EXTERIEUR">Intervenant Extérieur</option>
                         <option value="CTML">Chef de Cabinet (CTML)</option>
                      </select>
                   </div>
                   <button 
                     type="submit"
                     className="w-full bg-navy text-gold py-4 rounded-xl font-black text-xs uppercase tracking-[4px] shadow-xl hover:bg-navy-light transition-all flex items-center justify-center gap-3"
                   >
                      <Shield size={18} /> Valider l'Habilitation
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
