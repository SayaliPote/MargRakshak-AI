import React, { useState, useEffect, useCallback } from 'react';
import RiskBadge from '../../components/common/RiskBadge';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import NotificationToast from '../../components/common/NotificationToast';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Trash2, 
  Map, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveOfflineHotspot } from '../../utils/indexedDB';
import { useLanguage } from '../../context/LanguageContext';
import { getHotspots, createHotspot, deleteHotspot } from '../../services/api';
import { getFallbackHotspots, normalizeHotspot } from '../../data/hotspots';

export default function AdminHotspots() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hotspots, setHotspots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal states
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Notification Toast states
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Form states for adding new zone
  const [newZoneName, setNewZoneName] = useState('');
  const [newLat, setNewLat] = useState('19.9920');
  const [newLng, setNewLng] = useState('73.7920');
  const [newRiskLevel, setNewRiskLevel] = useState('MEDIUM');
  const [newRiskScore, setNewRiskScore] = useState('0.60');
  const [newAccidentCount, setNewAccidentCount] = useState('24');
  const [newDensity, setNewDensity] = useState('7.5');
  const [newRiskFactors, setNewRiskFactors] = useState('Poor Signage, Overspeeding');

  const [isFallbackHotspots, setIsFallbackHotspots] = useState(false);

  const fetchHotspots = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await getHotspots({ limit: 200 });
      const items = Array.isArray(response?.items)
        ? response.items
        : (Array.isArray(response) ? response : []);

      if (items.length > 0) {
        setHotspots(items.map(normalizeHotspot));
        setIsFallbackHotspots(false);
      } else {
        setHotspots(getFallbackHotspots());
        setIsFallbackHotspots(true);
      }
    } catch (err) {
      console.warn('Backend unreachable in AdminHotspots, using fallback mock hotspots:', err);
      setHotspots(getFallbackHotspots());
      setIsFallbackHotspots(true);
      setFetchError(err.message || 'API connection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Filter Logic
  const filteredHotspots = hotspots.filter(spot => {
    const spotName = spot.name || '';
    const riskFactorsList = Array.isArray(spot.riskFactors) ? spot.riskFactors : [];
    const matchesSearch = spotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          riskFactorsList.some(f => String(f).toLowerCase().includes(searchQuery.toLowerCase()));
    
    const level = String(spot.riskLevel || spot.risk_level || '').toUpperCase();
    const matchesRisk = riskFilter === 'ALL' || level === riskFilter.toUpperCase();

    return matchesSearch && matchesRisk;
  });

  const handleOpenDetails = (spot) => {
    setSelectedHotspot(spot);
    setIsDetailsOpen(true);
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneName.trim() || !newLat || !newLng) {
      alert(t('admin.hotspots.alertFillFields'));
      return;
    }

    const payload = {
      name: newZoneName.trim(),
      latitude: parseFloat(newLat),
      longitude: parseFloat(newLng),
      risk_level: newRiskLevel,
      risk_score: parseFloat(newRiskScore) || 0.5,
      density: parseFloat(newDensity) || 0.0,
      accident_count: parseInt(newAccidentCount) || 0,
      fatalities: 0,
      radius_meters: 200.0,
      risk_factors: newRiskFactors.split(',').map(f => f.trim()).filter(Boolean),
      algorithm: "HDBSCAN",
      source: "MANUAL",
      is_active: true,
    };

    try {
      const created = await createHotspot(payload);
      const normalizedCreated = {
        ...created,
        lat: typeof created.lat === 'number' ? created.lat : (Number(created.latitude) || parseFloat(newLat)),
        lng: typeof created.lng === 'number' ? created.lng : (Number(created.longitude) || parseFloat(newLng)),
        riskLevel: created.riskLevel || created.risk_level || newRiskLevel,
        riskScore: typeof created.riskScore === 'number' ? created.riskScore : (Number(created.risk_score) || parseFloat(newRiskScore)),
        accidentCount: typeof created.accidentCount === 'number' ? created.accidentCount : (Number(created.accident_count) || parseInt(newAccidentCount)),
        density: typeof created.density === 'number' ? created.density : (Number(created.density) || parseFloat(newDensity)),
        riskFactors: Array.isArray(created.riskFactors) ? created.riskFactors : payload.risk_factors,
        algorithm: created.algorithm || "HDBSCAN",
        lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      setHotspots(prev => [normalizedCreated, ...prev]);
      setToastType('success');
      setToastMessage(t('admin.hotspots.toastZoneAdded').replace('{name}', newZoneName));
    } catch (err) {
      console.error('Failed to create hotspot on backend:', err);
      // Fallback local update
      const localSpot = {
        id: Date.now(),
        ...payload,
        lat: parseFloat(newLat),
        lng: parseFloat(newLng),
        riskLevel: newRiskLevel,
        riskScore: parseFloat(newRiskScore),
        accidentCount: parseInt(newAccidentCount),
        riskFactors: payload.risk_factors,
        lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setHotspots(prev => [localSpot, ...prev]);
      setToastType('warning');
      setToastMessage(`Saved locally (${err.message})`);
    }

    setIsAddOpen(false);

    // Reset Form
    setNewZoneName('');
    setNewLat('19.9920');
    setNewLng('73.7920');
    setNewRiskLevel('MEDIUM');
    setNewRiskScore('0.60');
    setNewAccidentCount('24');
    setNewDensity('7.5');
    setNewRiskFactors('Poor Signage, Overspeeding');
  };

  const handleDeleteZone = async (id, name) => {
    if (confirm(t('admin.hotspots.confirmDelete').replace('{name}', name))) {
      try {
        await deleteHotspot(id);
      } catch (err) {
        console.error('Failed to delete hotspot on backend:', err);
      }
      setHotspots(prev => prev.filter(spot => spot.id !== id));
      setToastType('warning');
      setToastMessage(t('admin.hotspots.toastZoneRemoved').replace('{name}', name));
    }
  };

  const viewOnMap = (spot) => {
    setIsDetailsOpen(false);
    navigate('/admin/map');
  };

  const handleExportCSV = () => {
    setToastType('success');
    setToastMessage(t('admin.hotspots.toastExporting'));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Toast alert */}
      {toastMessage && (
        <NotificationToast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-gray-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {t('admin.hotspots.pageTitle')}
            </h1>
            <Badge variant="neutral" size="sm">
              {filteredHotspots.length} {t('admin.hotspots.zonesAudited')}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t('admin.hotspots.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            pill
            icon={Download}
            onClick={handleExportCSV}
          >
            {t('admin.hotspots.exportCsv')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            pill
            icon={Plus}
            onClick={() => setIsAddOpen(true)}
          >
            {t('admin.hotspots.addNewZone')}
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card padding="p-4" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-2.5 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder={t('admin.hotspots.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
          />
        </div>

        {/* Risk dropdown */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-2.5 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="pl-10 pr-8 py-2 w-full rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition cursor-pointer appearance-none"
          >
            <option value="ALL">{t('admin.hotspots.allRiskLevels')}</option>
            <option value="CRITICAL">{t('admin.hotspots.criticalRisk')}</option>
            <option value="HIGH">{t('admin.hotspots.highRisk')}</option>
            <option value="MEDIUM">{t('admin.hotspots.mediumRisk')}</option>
            <option value="LOW">{t('admin.hotspots.lowRisk')}</option>
          </select>
        </div>
      </Card>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-100">
                Failed to load hotspots from backend
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 font-mono">
                {fetchError}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="xs"
            pill
            icon={RefreshCw}
            onClick={fetchHotspots}
            className="self-start sm:self-auto shrink-0"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Fallback Notice Badge with Retry */}
      {isFallbackHotspots && (
        <div className="flex items-center justify-between gap-2 p-3 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Showing sample hotspot data — backend offline</span>
          </div>
          <button
            type="button"
            onClick={fetchHotspots}
            className="flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline cursor-pointer ml-3 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Directory Table matching user mockup */}
      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="min-w-[640px] w-full divide-y divide-gray-200/80 dark:divide-gray-800">
            <thead className="bg-gray-50/80 dark:bg-[#151821]/80 text-gray-700 dark:text-gray-300 font-bold text-[11px] text-left uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">{t('admin.hotspots.colZoneId')}</th>
                <th className="px-6 py-4">{t('admin.hotspots.colGps')}</th>
                <th className="px-6 py-4">{t('admin.hotspots.colSeverity')}</th>
                <th className="px-6 py-4 text-center">{t('admin.hotspots.colIncidents')}</th>
                <th className="px-6 py-4 text-center">{t('admin.hotspots.colDensity')}</th>
                <th className="px-6 py-4 text-center">{t('admin.hotspots.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs sm:text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-sm font-medium">Loading hotspots from backend...</span>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-6 h-6" />
                      <p className="text-sm font-bold">Unable to display hotspots</p>
                      <p className="text-xs text-red-500 dark:text-red-400 font-mono max-w-md">{fetchError}</p>
                      <Button variant="secondary" size="xs" pill icon={RefreshCw} onClick={fetchHotspots} className="mt-2">
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredHotspots.length > 0 ? (
                filteredHotspots.map((spot, idx) => (
                  <tr 
                    key={spot.id} 
                    className={`transition duration-150 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-[#111319]' : 'bg-gray-50/40 dark:bg-[#13151D]'
                    } hover:bg-gray-100/70 dark:hover:bg-[#191D26]`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {spot.name}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        AC{String(spot.id).padStart(4, '0')} • {spot.algorithm}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {typeof spot.lat === 'number' ? spot.lat.toFixed(5) : spot.lat}, {typeof spot.lng === 'number' ? spot.lng.toFixed(5) : spot.lng}
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={spot.riskLevel} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-red-600 dark:text-red-400 font-mono">
                      {spot.accidentCount}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-700 dark:text-gray-300 font-mono">
                      {spot.density}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(spot)}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                          title={t('admin.hotspots.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(spot.id, spot.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition"
                          title={t('admin.hotspots.deleteZone')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-400 dark:text-gray-500">
                    {t('admin.hotspots.emptyState')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar matching user mockup */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151821]/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            {t('admin.hotspots.showing')} <span className="font-bold text-gray-900 dark:text-white">{filteredHotspots.length}</span> {t('admin.hotspots.recordedClusters')}
          </div>
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                  currentPage === page
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {page}
              </button>
            ))}
            <span className="px-1 text-gray-400">...</span>
            <button
              onClick={() => setCurrentPage(12)}
              className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                currentPage === 12
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              12
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(12, prev + 1))}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Details Modal */}
      <Modal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)}
        title={t('admin.hotspots.detailsModalTitle')}
      >
        {selectedHotspot && (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedHotspot.name}</h4>
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">
                  GPS: {typeof selectedHotspot.lat === 'number' ? selectedHotspot.lat.toFixed(6) : selectedHotspot.lat}, {typeof selectedHotspot.lng === 'number' ? selectedHotspot.lng.toFixed(6) : selectedHotspot.lng}
                </p>
              </div>
              <RiskBadge level={selectedHotspot.riskLevel} />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-b border-gray-100 dark:border-gray-800 py-3.5">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.hotspots.riskScore')}</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selectedHotspot.riskScore}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.hotspots.accidentFrequency')}</span>
                <span className="text-2xl font-black text-red-500">{selectedHotspot.accidentCount} {t('admin.hotspots.incidents')}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.hotspots.pointDensity')}</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedHotspot.density} / km²</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.hotspots.clusteringEngine')}</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedHotspot.algorithm}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">
                {t('admin.hotspots.causalRiskFactors')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedHotspot.riskFactors || []).map((factor, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-full border border-gray-200/80 dark:border-gray-700/80"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-gray-400 italic">
              {t('admin.hotspots.lastAudited')}: {selectedHotspot.lastUpdated}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                pill
                onClick={() => setIsDetailsOpen(false)}
                className="flex-1"
              >
                {t('common.close')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                pill
                icon={Map}
                onClick={() => viewOnMap(selectedHotspot)}
                className="flex-1"
              >
                {t('admin.hotspots.viewOnMap')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add New Zone Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={t('admin.hotspots.addModalTitle')}
      >
        <form onSubmit={handleAddZone} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.hotspots.zoneName')}
            </label>
            <input 
              type="text" 
              placeholder={t('admin.hotspots.zoneNamePlaceholder')}
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.hotspots.latitude')}
              </label>
              <input 
                type="number" 
                step="0.0001"
                placeholder="19.9912"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.hotspots.longitude')}
              </label>
              <input 
                type="number" 
                step="0.0001"
                placeholder="73.8015"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.hotspots.riskClassification')}
              </label>
              <select
                value={newRiskLevel}
                onChange={(e) => setNewRiskLevel(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              >
                <option value="CRITICAL">{t('common.risk.critical')}</option>
                <option value="HIGH">{t('common.risk.high')}</option>
                <option value="MEDIUM">{t('common.risk.medium')}</option>
                <option value="LOW">{t('common.risk.low')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.hotspots.riskScoreLabel')}
              </label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="1"
                placeholder="0.85"
                value={newRiskScore}
                onChange={(e) => setNewRiskScore(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.hotspots.accidentsCount')}
              </label>
              <input 
                type="number" 
                placeholder="35"
                value={newAccidentCount}
                onChange={(e) => setNewAccidentCount(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.hotspots.densityMetric')}
              </label>
              <input 
                type="number" 
                step="0.1"
                placeholder="10.4"
                value={newDensity}
                onChange={(e) => setNewDensity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('admin.hotspots.riskFactors')}
            </label>
            <input 
              type="text" 
              placeholder={t('admin.hotspots.riskFactorsPlaceholder')}
              value={newRiskFactors}
              onChange={(e) => setNewRiskFactors(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              pill
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              pill
              type="submit"
              className="flex-1"
            >
              {t('admin.hotspots.saveZone')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
