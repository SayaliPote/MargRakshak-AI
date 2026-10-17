import React from 'react';
import Modal from './Modal';
import RiskBadge from './RiskBadge';
import { MapPin, AlertTriangle, HeartCrack, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Shown when the driver taps "View Hotspot Details" on a proximity alert.
 * Reuses the existing Modal + RiskBadge components to stay visually
 * consistent with the rest of MargRakshak.
 */
export default function HotspotDetailsModal({ isOpen, onClose, hotspot, distanceMeters }) {
  const { t } = useLanguage();
  if (!isOpen || !hotspot) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.hotspotModal.title')} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-black text-gray-900 dark:text-white leading-snug">{hotspot.name}</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {hotspot.lat?.toFixed(4)}, {hotspot.lng?.toFixed(4)}
            </p>
          </div>
          <RiskBadge level={hotspot.riskLevel || hotspot.risk} />
        </div>

        {typeof distanceMeters === 'number' && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-3.5 py-2.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
            {distanceMeters} {t('common.hotspotModal.mAhead')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {t('common.hotspotModal.accidentsRecorded')}
            </span>
            <span className="text-xl font-black text-gray-900 dark:text-white block mt-1">
              {hotspot.accidentCount ?? '—'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase flex items-center gap-1">
              <HeartCrack className="w-3 h-3" /> {t('common.hotspotModal.fatalities')}
            </span>
            <span className="text-xl font-black text-gray-900 dark:text-white block mt-1">
              {hotspot.fatalities ?? '—'}
            </span>
          </div>
        </div>

        {hotspot.safetyRecommendation && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1 mb-1">
              <ShieldCheck className="w-3 h-3" /> {t('common.hotspotModal.safetyRecommendation')}
            </span>
            <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              {hotspot.safetyRecommendation}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
