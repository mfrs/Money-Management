import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Megaphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../lib/api';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchChangelogs();
    }
  }, [isOpen]);

  const fetchChangelogs = async () => {
    try {
      setLoading(true);
      const data = await api.get('/changelog');
      setChangelogs(data || []);
      
      // Update local storage so we know the user has seen the latest version
      if (data && data.length > 0) {
        localStorage.setItem('stashly_last_seen_changelog', data[0].id);
        // Trigger a custom event so TopBar can update the red dot immediately
        window.dispatchEvent(new Event('changelog_seen'));
      }
    } catch (err) {
      console.error('Failed to fetch changelogs', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-4"
          >
            <div className="bg-surface border border-on-surface/10 shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 bg-on-surface/[0.02] border-b border-on-surface/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-on-surface">What's New</h2>
                    <p className="text-xs text-on-surface/40 uppercase tracking-widest font-medium mt-0.5">Latest updates & features</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-on-surface/5 text-on-surface/40 hover:bg-on-surface/10 hover:text-on-surface transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto overflow-x-hidden space-y-6">
                {loading ? (
                  <div className="text-center py-10 text-on-surface/40 uppercase tracking-widest text-sm">
                    Checking for updates...
                  </div>
                ) : changelogs.length === 0 ? (
                  <div className="text-center py-10 text-on-surface/40 uppercase tracking-widest text-sm">
                    No recent updates.
                  </div>
                ) : (
                  changelogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-on-surface/5 last:hidden" />
                      
                      <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-surface flex items-center justify-center shrink-0 mt-1 z-10">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">
                              {log.version}
                            </span>
                            {log.releaseDate && (
                              <span className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest">
                                {new Date(log.releaseDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-on-surface text-lg mb-3">{log.title}</h3>
                          <div className="prose prose-sm prose-invert max-w-none text-on-surface/70 prose-headings:text-on-surface prose-headings:font-display prose-a:text-primary prose-strong:text-on-surface">
                            <ReactMarkdown>{log.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
