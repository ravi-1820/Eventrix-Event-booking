import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

const DIETARY_COLORS = {
  'None': 'bg-surface-container-highest/80 backdrop-blur-md text-on-surface-variant',
  'Vegetarian': 'bg-emerald-500/20 text-emerald-400',
  'Vegan': 'bg-green-500/20 text-green-400',
  'Gluten-Free': 'bg-amber-500/20 text-amber-400',
  'Halal': 'bg-blue-500/20 text-blue-400',
  'Kosher': 'bg-purple-500/20 text-purple-400',
};

function RequirementCard({ req, onToggle }) {
  const { t, translateEvent } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(req.organizer_notes || '');
  const [saving, setSaving] = useState(false);

  const initials = req.participant_name
    ? req.participant_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const dietaryStyle = DIETARY_COLORS[req.dietary_preference] || 'bg-surface-container-highest/80 text-on-surface-variant';

  const handleToggle = async () => {
    setSaving(true);
    try {
      await onToggle(req.id, notes);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.toggleRequirement(req.id, notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`bg-surface-container-lowest shadow-sm rounded-2xl p-5 transition-all duration-300 border ${
        req.is_fulfilled
          ? 'border-l-4 border-l-emerald-500 border-surface-container-low opacity-70'
          : 'border-l-4 border-l-primary border-surface-container-low'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#075985] font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-[#075985]/20">
          {initials}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-headline-sm text-headline-sm text-on-surface">{req.participant_name}</p>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 truncate">{translateEvent({ title: req.event_title }).title || req.event_title}</p>
            </div>
            <span className="font-mono text-[11px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded shrink-0">
              {req.booking_id}
            </span>
          </div>

          {/* Preference chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {req.dietary_preference && req.dietary_preference !== 'None' && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${dietaryStyle}`}>
                🍽 {req.dietary_preference}
              </span>
            )}
            {req.seating_preference && req.seating_preference !== 'Standard' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-900/40 text-blue-400">
                💺 {req.seating_preference}
              </span>
            )}
            {req.special_requests && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-900/40 text-violet-400">
                ✨ {t('admin.requirements.specialRequest', 'Special Request')}
              </span>
            )}
          </div>

          {/* Special requests text */}
          {req.special_requests && (
            <p className="font-body-sm text-xs text-on-surface-variant mt-2 bg-surface-container-high/50 rounded-xl px-3 py-2 italic">
              "{req.special_requests}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button
            variant={req.is_fulfilled ? 'ghost' : 'secondary'}
            size="sm"
            loading={saving}
            onClick={handleToggle}
            className={req.is_fulfilled ? 'text-emerald-400 hover:text-emerald-300' : ''}
          >
            {req.is_fulfilled ? (
              <><CheckCircle2 size={14} /> {t('admin.requirements.fulfilled', 'Fulfilled')}</>
            ) : (
              <><Clock size={14} /> {t('admin.requirements.markDone', 'Mark Done')}</>
            )}
          </Button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <StickyNote size={12} />
            {t('admin.requirements.notes', 'Notes')}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Organizer notes expansion */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-surface-container-low flex gap-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.requirements.notesPlaceholder', 'Add organizer notes...')}
                rows={2}
                className="flex-1 bg-surface-container-high border border-surface-container rounded-xl px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-none"
              />
              <Button variant="secondary" size="sm" loading={saving} onClick={handleSaveNotes}>
                {t('admin.requirements.save', 'Save')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AdminRequirementsTracker({ requirements, onToggle }) {
  const { t } = useLanguage();
  const pending = requirements.filter((r) => !r.is_fulfilled);
  const fulfilled = requirements.filter((r) => r.is_fulfilled);

  if (requirements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center mb-space-md shadow-inner">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <p className="font-headline-md text-headline-md text-on-surface">{t('admin.requirements.allClear', 'All clear!')}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{t('admin.requirements.noRequirements', 'No custom requirements from participants yet.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-primary" />
            <h3 className="font-label-sm text-xs font-bold text-primary uppercase tracking-widest">
              {t('admin.requirements.pendingHeading', 'Pending')} ({pending.length})
            </h3>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {pending.map((req) => (
                <RequirementCard key={req.id} req={req} onToggle={onToggle} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Fulfilled */}
      {fulfilled.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {t('admin.requirements.fulfilledHeading', 'Fulfilled')} ({fulfilled.length})
            </h3>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {fulfilled.map((req) => (
                <RequirementCard key={req.id} req={req} onToggle={onToggle} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
