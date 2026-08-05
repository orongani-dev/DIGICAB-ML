import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, X, User as UserIcon, Lock, 
  Unlock, Hash, Search, Bell, History, Circle, Plus
} from 'lucide-react';
import { ChatSession, ChatMessage, User } from '../types';
import { api } from '../api';
import { cn } from '../lib/utils';

interface ChatSystemProps {
  currentUser: User;
}

export default function ChatSystem({ currentUser }: ChatSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isNewChatModal, setIsNewChatModal] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);

  const [sharedSessions, setSharedSessions] = useState<ChatSession[]>([]);
  const [isShareModal, setIsShareModal] = useState(false);

  const isML = currentUser.role === 'ML' || currentUser.role === 'ADMIN';
  const isResponsable = currentUser.role === 'RESPONSABLE';
  const isStandard = currentUser.role === 'STANDARD';

  useEffect(() => {
    loadSessions();
    loadUsers();
    if (isResponsable || isStandard) loadSharedSessions();
    
    pollRef.current = setInterval(() => {
      loadSessions();
      if (activeSession) {
        loadMessages(activeSession.id);
        checkSessionStatus(activeSession.id);
      }
      checkUnread();
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [activeSession]);

  const checkSessionStatus = async (sessionId: number) => {
    try {
      const data = await api.getChatSessions(currentUser.id, currentUser.role);
      const current = data.find(s => s.id === sessionId);
      if (current && current.status === 'CLOSED' && activeSession?.status === 'OPEN') {
        setActiveSession(current);
      }
    } catch (e) {}
  };

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions(currentUser.id, currentUser.role);
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSharedSessions = async () => {
    try {
      const data = await api.getSharedChatSessions(currentUser.id);
      setSharedSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setAllUsers(data.filter(u => u.id !== currentUser.id));
    } catch (error) {
      console.error(error);
    }
  };

  const loadMessages = async (sessionId: number) => {
    try {
      const data = await api.getChatMessages(sessionId);
      setMessages(data);
    } catch (error) {
      console.error(error);
    }
  };

  const checkUnread = async () => {
    try {
      const { count } = await api.getUnreadCount();
      setUnreadTotal(count);
    } catch (error) {
       console.error(error);
    }
  };

  const handleStartSession = async (participantId: number) => {
    try {
      const session = await api.startChatSession(currentUser.id, participantId);
      setIsNewChatModal(false);
      setActiveSession(session);
      loadMessages(session.id);
      setIsOpen(true);
      loadSessions();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !newMessage.trim()) return;

    try {
      await api.sendChatMessage(activeSession.id, currentUser.id, newMessage.trim());
      setNewMessage('');
      loadMessages(activeSession.id);
    } catch (error: any) {
      alert(error.message || "Erreur lors de l'envoi");
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    if (!confirm("Fermer cette session définitivement pour tous les participants ?")) return;
    try {
      await api.closeChatSession(sessionId, currentUser.id);
      loadSessions();
      // Refresh active session to show CLOSED status
      const updated = await api.getChatSessions(currentUser.id, currentUser.role);
      const current = updated.find(s => s.id === sessionId);
      if (current) setActiveSession(current);
    } catch (error) {
      console.error(error);
    }
  };

  const handleShareSession = async (targetUserId: number) => {
    if (!activeSession) return;
    try {
      await api.shareChatSession(activeSession.id, targetUserId);
      setIsShareModal(false);
      alert("Enregistrement transféré avec succès.");
    } catch (error) {
      alert("Erreur lors du transfert");
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[200]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-navy text-gold rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-2 border-gold relative"
        >
          <MessageSquare size={24} />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-black border-2 border-surface shadow-lg animate-bounce">
              {unreadTotal}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed inset-y-0 right-0 w-[400px] bg-surface z-[210] shadow-2xl border-l-2 border-gold flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-navy text-gold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-gold" />
                <div>
                  <h3 className="text-xl font-serif font-black uppercase tracking-tighter">Messagerie Sécurisée</h3>
                  <p className="text-[0.6rem] font-bold text-gold/60 uppercase tracking-widest">Ligne Directe Cabinet ML</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gold/60 hover:text-gold">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
               {/* Session List or Active Chat */}
               {activeSession ? (
                 <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Active Header */}
                    <div className="p-4 bg-bg border-b border-border-theme flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <button onClick={() => { setActiveSession(null); setMessages([]); }} className="p-2 hover:bg-gold/10 rounded-lg text-navy">
                             <History size={16} />
                          </button>
                          <div>
                             <p className="text-xs font-black text-navy uppercase">
                               {activeSession.manager_id === currentUser.id ? activeSession.participant_name : activeSession.manager_name}
                             </p>
                             <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-widest">
                                {activeSession.status === 'OPEN' ? (
                                  <span className="flex items-center gap-1 text-emerald-500"><Circle size={8} fill="currentColor" /> Session Ouverte</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-rose-500"><Lock size={8} /> Session Fermée</span>
                                )}
                             </p>
                          </div>
                       </div>
                      <div className="flex items-center gap-2">
                        {isML && (
                           <button 
                             onClick={() => setIsShareModal(true)}
                             className="p-2 text-gold bg-navy hover:bg-navy-light rounded-lg text-[0.6rem] font-black uppercase flex items-center gap-1"
                           >
                             <Send size={12} /> Transférer
                           </button>
                        )}
                        {(isML || isResponsable || (activeSession.created_by === currentUser.id)) && activeSession.status === 'OPEN' && (
                          <button 
                            onClick={() => handleCloseSession(activeSession.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-[0.6rem] font-black uppercase tracking-widest flex items-center gap-1"
                          >
                            <Lock size={12} /> Fermer
                          </button>
                        )}
                      </div>
                   </div>

                   {/* Messages */}
                   <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                      {messages.map(msg => (
                        <div 
                          key={msg.id}
                          className={cn(
                            "max-w-[80%] p-3 rounded-2xl shadow-sm border",
                            msg.sender_id === currentUser.id 
                                ? "ml-auto bg-navy text-white rounded-tr-none border-navy-light" 
                                : "mr-auto bg-white text-navy rounded-tl-none border-border-theme"
                          )}
                        >
                           <p className="text-sm font-medium">{msg.content}</p>
                           <span className="text-[0.6rem] opacity-50 block mt-1 text-right italic">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      ))}
                      {activeSession.status === 'CLOSED' && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                           <Lock size={20} className="mx-auto text-rose-500 mb-2" />
                           <p className="text-[0.65rem] font-black text-rose-700 uppercase tracking-widest">Cette session a été fermée par le responsable.</p>
                        </div>
                      )}
                   </div>

                   {/* Input */}
                   {activeSession.status === 'OPEN' && (
                     <form onSubmit={handleSendMessage} className="p-4 bg-surface border-t border-border-theme flex gap-2">
                        <input 
                          type="text" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Votre message ici..."
                          className="flex-1 p-3 bg-bg border border-border-theme rounded-xl focus:outline-none focus:border-gold font-medium text-sm"
                        />
                        <button type="submit" className="w-12 h-12 bg-navy text-gold rounded-xl flex items-center justify-center hover:bg-navy-light transition-all shadow-lg">
                           <Send size={20} />
                        </button>
                     </form>
                   )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                   {/* Search/New Session for Managers */}
                   {(isML || isResponsable || isStandard) && (
                     <div className="p-4 bg-bg border-b border-border-theme">
                        <button 
                          onClick={() => setIsNewChatModal(true)}
                          className="w-full py-3 bg-gold text-navy rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gold/90 transition-all shadow-md"
                        >
                           <Plus size={16} /> Nouvelle Session
                        </button>
                     </div>
                   )}

                   {/* Sessions List */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-3">
                       {sharedSessions.length > 0 && (
                         <>
                           <p className="text-[0.6rem] font-black text-rose-500 uppercase tracking-[3px] mb-2 px-2 flex items-center gap-2">
                             <History size={12} /> Partages du ML
                           </p>
                           {sharedSessions.map(session => (
                              <button 
                                key={`shared-${session.id}`}
                                onClick={() => setActiveSession(session)}
                                className="w-full p-4 rounded-2xl border-2 bg-rose-50 border-rose-200 transition-all flex items-center justify-between text-left hover:border-rose-400"
                              >
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xs">
                                       <History size={16} />
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-navy uppercase">
                                         {session.manager_name} ↔ {session.participant_name}
                                       </p>
                                       <p className="text-[0.6rem] font-bold text-rose-600 uppercase tracking-widest mt-0.5">
                                         Archives Transférées
                                       </p>
                                    </div>
                                 </div>
                              </button>
                           ))}
                           <div className="h-px bg-border-theme my-4" />
                         </>
                       )}
                       <p className="text-[0.6rem] font-black text-text-muted uppercase tracking-[3px] mb-2 px-2">Mes Conversations</p>
                      {sessions.length === 0 ? (
                        <div className="text-center py-20 text-text-muted italic text-xs">Aucune conversation active.</div>
                      ) : (
                        sessions.map(session => (
                           <button 
                             key={session.id}
                             onClick={() => setActiveSession(session)}
                             className={cn(
                               "w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left",
                               session.unread_count && session.unread_count > 0 ? "bg-gold/10 border-gold" : "bg-bg border-border-theme hover:border-gold/30"
                             )}
                           >
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-navy text-gold flex items-center justify-center font-black text-xs">
                                    {(session.manager_id === currentUser.id ? session.participant_name : session.manager_name)?.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-navy uppercase">
                                      {session.manager_id === currentUser.id ? session.participant_name : session.manager_name}
                                    </p>
                                    <p className="text-[0.6rem] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                      {session.status === 'OPEN' ? <Unlock size={10} className="text-emerald-500" /> : <Lock size={10} className="text-rose-500" />}
                                      {session.participant_role}
                                    </p>
                                 </div>
                              </div>
                              {session.unread_count && session.unread_count > 0 && (
                                <span className="bg-gold text-navy w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-black">{session.unread_count}</span>
                              )}
                           </button>
                        ))
                      )}
                   </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Chat Selection Modal */}
      {/* Share Modal for ML */}
      <AnimatePresence>
        {isShareModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border-2 border-gold overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 bg-navy text-gold flex justify-between items-center">
                 <h3 className="text-xl font-serif font-black uppercase tracking-tighter">Transférer l'archive</h3>
                 <button onClick={() => setIsShareModal(false)} className="text-gold/60"><X size={24} /></button>
              </div>
              <div className="p-4 bg-bg border-b border-border-theme">
                 <p className="text-[0.65rem] font-bold text-navy uppercase text-center">Sélectionnez un responsable pour analyse</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {allUsers.filter(u => u.role === 'RESPONSABLE').map(user => (
                   <button 
                     key={`share-to-${user.id}`}
                     onClick={() => handleShareSession(user.id)}
                     className="w-full p-3 bg-bg border border-border-theme rounded-xl flex items-center gap-3 hover:border-gold transition-all text-left"
                   >
                     <div className="w-8 h-8 rounded-full bg-gold text-navy flex items-center justify-center text-[0.6rem] font-black">{user.name?.charAt(0) || '?'}</div>
                     <div>
                        <p className="text-xs font-black text-navy uppercase leading-none">{user.name}</p>
                        <p className="text-[0.6rem] font-bold text-text-muted mt-1">{user.role}</p>
                     </div>
                   </button>
                 ))}
                 {allUsers.filter(u => u.role === 'RESPONSABLE').length === 0 && (
                    <p className="text-center py-8 text-text-muted text-xs italic">Aucun responsable disponible.</p>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewChatModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border-2 border-gold overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 bg-navy text-gold flex justify-between items-center">
                 <h3 className="text-xl font-serif font-black uppercase tracking-tighter">Ouvrir une Session</h3>
                 <button onClick={() => setIsNewChatModal(false)} className="text-gold/60"><X size={24} /></button>
              </div>
              <div className="p-4 bg-bg border-b border-border-theme">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input type="text" placeholder="Rechercher un membre..." className="w-full pl-9 pr-4 py-2 bg-white border border-border-theme rounded-lg text-xs font-bold text-navy" />
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {allUsers.map(user => (
                   <button 
                     key={user.id}
                     onClick={() => handleStartSession(user.id)}
                     className="w-full p-3 bg-bg border border-border-theme rounded-xl flex items-center gap-3 hover:border-gold transition-all text-left"
                   >
                     <div className="w-8 h-8 rounded-full bg-navy text-gold flex items-center justify-center text-[0.6rem] font-black">{user.name?.charAt(0) || '?'}</div>
                     <div>
                        <p className="text-xs font-black text-navy uppercase leading-none">{user.name}</p>
                        <p className="text-[0.6rem] font-bold text-text-muted mt-1">{user.role}</p>
                     </div>
                   </button>
                 ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
