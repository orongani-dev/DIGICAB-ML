import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, UserMinus, Plus, Trash2, Edit2, 
  Search, Shield, CheckCircle2, X, Users2, Info
} from 'lucide-react';
import { Committee, User } from '../types';
import { api } from '../api';
import { cn } from '../lib/utils';

export default function CommitteesView() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coms, users] = await Promise.all([
        api.getCommittees(),
        api.getUsers()
      ]);
      setCommittees(coms);
      setAllUsers(users);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (committeeId: number) => {
    try {
      const data = await api.getCommitteeMembers(committeeId);
      setMembers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectCommittee = (committee: Committee) => {
    setSelectedCommittee(committee);
    loadMembers(committee.id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCommittee && selectedCommittee.id) {
        await api.updateCommittee(selectedCommittee.id, formData);
      } else {
        await api.createCommittee(formData);
      }
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      setSelectedCommittee(null);
      loadData();
    } catch (error) {
      alert("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce comité ?")) return;
    try {
      await api.deleteCommittee(id);
      if (selectedCommittee?.id === id) setSelectedCommittee(null);
      loadData();
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  const toggleMember = async (userId: number) => {
    if (!selectedCommittee) return;
    try {
      await api.toggleCommitteeMember(selectedCommittee.id, userId);
      loadMembers(selectedCommittee.id);
      loadData(); // To update member count
    } catch (error) {
      console.error(error);
    }
  };

  const isMember = (userId: number) => members.some(m => m.id === userId);

  const isML = localStorage.getItem('digicab_user') ? JSON.parse(localStorage.getItem('digicab_user')!).role === 'ML' : false;

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="bg-navy p-6 rounded-2xl shadow-xl border-2 border-gold flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-black text-gold uppercase tracking-tighter">
            Comités & Groupes de Travail
          </h2>
          <p className="text-[0.7rem] font-bold text-gold/60 uppercase tracking-[4px] mt-1">
            Gestion des instances de validation et de pilotage
          </p>
        </div>
        {!isML && (
        <button 
          onClick={() => {
            setSelectedCommittee(null);
            setFormData({ name: '', description: '' });
            setIsModalOpen(true);
          }}
          className="bg-gold text-navy px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gold/90 transition-all shadow-lg"
        >
          <Plus size={18} /> Nouveau Comité
        </button>
        )}
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Committee List */}
        <div className="w-1/3 bg-surface rounded-xl border border-border-theme shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border-theme bg-bg/30">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input 
                type="text" 
                placeholder="Rechercher un comité..."
                className="w-full pl-9 pr-4 py-2 bg-bg border border-border-theme rounded-lg text-xs font-bold text-navy focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {committees.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(committee => (
              <div 
                key={committee.id}
                onClick={() => handleSelectCommittee(committee)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all cursor-pointer group",
                  selectedCommittee?.id === committee.id 
                    ? "bg-gold/5 border-gold shadow-md" 
                    : "bg-surface border-border-theme hover:border-gold/30"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-serif font-black text-navy uppercase text-sm leading-tight">{committee.name}</h4>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isML && (
                    <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCommittee(committee);
                        setFormData({ name: committee.name, description: committee.description });
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-navy hover:text-gold rounded text-navy"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(committee.id);
                      }}
                      className="p-1.5 hover:bg-rose-500 hover:text-white rounded text-rose-500"
                    >
                      <Trash2 size={12} />
                    </button>
                    </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[0.6rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                    <Users size={10} /> {committee.member_count} Membres
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Members Management */}
        <div className="flex-1 bg-surface rounded-xl border border-border-theme shadow-sm flex flex-col overflow-hidden">
          {selectedCommittee ? (
            <div className="flex flex-col h-full">
              <div className="p-8 border-b border-border-theme bg-navy text-gold">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gold text-navy rounded-xl flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-gold/20">
                    {selectedCommittee.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-black uppercase tracking-tighter">{selectedCommittee.name}</h3>
                    <p className="text-[0.7rem] font-bold text-gold/60 uppercase tracking-widest mt-1">{selectedCommittee.description || 'Aucune description'}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Current Members */}
                <div className="w-1/2 border-r border-border-theme flex flex-col overflow-hidden">
                  <div className="p-4 bg-bg/50 border-b border-border-theme flex items-center justify-between">
                    <span className="text-[0.65rem] font-black text-navy uppercase tracking-widest">Membres Actuels</span>
                    <Shield size={14} className="text-gold" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {members.length === 0 ? (
                      <div className="text-center py-12 text-text-muted italic text-xs">Aucun membre dans ce comité.</div>
                    ) : (
                      members.map(member => (
                        <div key={member.id} className="p-3 bg-bg border border-border-theme rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy text-gold flex items-center justify-center text-[0.6rem] font-black">{member.name?.charAt(0) || '?'}</div>
                            <div>
                                <p className="text-xs font-black text-navy uppercase leading-none">{member.name}</p>
                                <p className="text-[0.6rem] font-bold text-text-muted mt-1">{member.role}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleMember(member.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <UserMinus size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Members */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 bg-bg/50 border-b border-border-theme flex items-center justify-between">
                    <span className="text-[0.65rem] font-black text-navy uppercase tracking-widest">Ajouter des Membres</span>
                    <Users2 size={14} className="text-navy" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {allUsers.filter(u => !isMember(u.id)).map(user => (
                      <div key={user.id} className="p-3 bg-surface border border-border-theme rounded-lg flex items-center justify-between hover:border-gold/50 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-bg text-text-muted flex items-center justify-center text-[0.6rem] font-black border border-border-theme">{user.name?.charAt(0) || '?'}</div>
                            <div>
                                <p className="text-xs font-black text-navy uppercase leading-none">{user.name}</p>
                                <p className="text-[0.6rem] font-bold text-text-muted mt-1">{user.role}</p>
                            </div>
                        </div>
                        <button 
                          onClick={() => toggleMember(user.id)}
                          className="p-2 text-gold hover:bg-gold/10 rounded-lg transition-all"
                        >
                          <UserPlus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <Users2 size={64} className="text-navy opacity-5 mb-2" />
              <h3 className="text-2xl font-serif font-black text-navy/20 uppercase tracking-tighter">Sélectionnez un Comité</h3>
              <p className="text-[0.7rem] font-bold text-text-muted uppercase tracking-[3px] max-w-xs">
                Gérez la composition des comites techniques et de pilotage stratégique.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouveau Comité */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border-2 border-gold overflow-hidden"
            >
              <div className="p-6 bg-navy text-gold flex items-center justify-between">
                <h3 className="text-xl font-serif font-black uppercase tracking-tighter flex items-center gap-2">
                  <Info className="text-gold" /> {selectedCommittee ? "Modifier Comité" : "Nouveau Comité"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gold/60 hover:text-gold transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest ml-1">Nom de l'Instance</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Comité de Pilotage Strategique"
                    className="w-full p-4 bg-bg border-2 border-border-theme rounded-xl focus:outline-none focus:border-gold font-bold text-navy"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-black text-text-muted uppercase tracking-widest ml-1">Description / Rôle</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Définissez les missions de ce groupe..."
                    className="w-full p-4 bg-bg border-2 border-border-theme rounded-xl focus:outline-none focus:border-gold font-medium text-sm min-h-[120px]"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-navy text-gold py-4 rounded-xl font-black text-sm uppercase tracking-[4px] hover:bg-navy-light transition-all shadow-xl"
                >
                  {selectedCommittee ? "Mettre à jour" : "Créer l'Instance"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
