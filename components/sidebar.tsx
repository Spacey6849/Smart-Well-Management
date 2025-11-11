'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
// Markdown rendering (safe require handling of default export)
let ReactMarkdown: any;
let remarkGfm: any;
try {
  // Some bundlers expose default, others the function itself
  const md = require('react-markdown');
  ReactMarkdown = md.default || md;
  const gfm = require('remark-gfm');
  remarkGfm = gfm.default || gfm;
} catch {
  // Fallback no-op renderer if lib not loaded
  const FallbackMD = (props: any) => <>{props.children}</>;
  FallbackMD.displayName = 'FallbackMarkdown';
  ReactMarkdown = FallbackMD;
  remarkGfm = () => {};
}
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Gauge, Droplets, Thermometer, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WellData } from '@/lib/well-data';
import { MetricCard } from './metric-card';
import { WellChart } from './well-chart';
import { PredictiveChart } from './predictive-chart';
import { ThemeToggle } from './theme-toggle';

interface SidebarProps {
  wells: WellData[];
  selectedWell?: WellData;
  onWellSelect: (well: WellData) => void;
  onSearchHighlightChange?: (ids: string[]) => void; // emit matching well ids for map highlighting
}

export function Sidebar({ wells, selectedWell, onWellSelect, onSearchHighlightChange }: SidebarProps) {
  // Start collapsed by default (mobile); expand on desktop after mount
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChart, setActiveChart] = useState<'ph' | 'tds' | 'temperature' | 'waterLevel' | 'turbidity'>('ph');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredWells = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return wells.filter(well => well.name.toLowerCase().includes(q));
  }, [wells, searchQuery]);

  // Emit highlight ids for map markers
  useEffect(() => {
    if (!onSearchHighlightChange) return;
    // Only compute ids when query changes (filteredWells already memoized on query/wells)
    const ids = searchQuery ? filteredWells.map(w=>w.id) : [];
    onSearchHighlightChange(ids);
  }, [searchQuery, filteredWells, onSearchHighlightChange]);

  // Select helper
  const selectWell = (well: WellData) => {
    onWellSelect(well);
    setSearchQuery(well.name);
    setShowSuggestions(false);
  };

  const getMetricStatus = (value: number, type: 'ph' | 'tds' | 'temperature' | 'waterLevel') => {
    switch (type) {
      case 'ph':
        if (value >= 6.5 && value <= 8.5) return 'good';
        if (value >= 6.0 && value <= 9.0) return 'warning';
        return 'critical';
      case 'tds':
        if (value <= 300) return 'good';
        if (value <= 500) return 'warning';
        return 'critical';
      case 'temperature':
        if (value >= 15 && value <= 25) return 'good';
        if (value >= 10 && value <= 30) return 'warning';
        return 'critical';
      case 'waterLevel':
        if (value >= 40) return 'good';
        if (value >= 30) return 'warning';
        return 'critical';
      default:
        return 'good';
    }
  };

  const sidebarVariants = {
    expanded: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
    },
    collapsed: {
      x: -380,
      opacity: 0,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    }
  } as const;

  const contentVariants = {
    expanded: {
      opacity: 1,
      transition: { duration: 0.15, delay: 0.1 }
    },
    collapsed: {
      opacity: 0,
      transition: { duration: 0.1 }
    }
  };

  // Expand automatically on desktop screens after mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsCollapsed(false);
    }
  }, []);

  return (
  <div className="h-full relative pl-0 pr-0 md:pl-2 md:pr-4">
      {/* Toggle Handle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex group fixed md:absolute top-1/2 -translate-y-1/2
          ${isCollapsed ? 'left-2' : 'right-2 md:left-[340px] md:right-auto'}
          z-[1250] w-8 h-16 items-center justify-center rounded-md bg-white/95 dark:bg-gray-900/90 border border-gray-300/60 dark:border-gray-700/60 shadow-lg hover:bg-white dark:hover:bg-gray-900 hover:shadow-xl transition-all duration-200`}
        aria-label={isCollapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors" />
        </motion.div>
      </button>
      <motion.div
        className="h-full w-full md:w-[360px] pointer-events-auto fixed md:static inset-y-0 left-0 z-[1150] md:z-auto"
        variants={sidebarVariants}
        animate={isCollapsed ? 'collapsed' : 'expanded'}
        initial={false}
      >
    <div className="h-full bg-white/95 dark:bg-gray-950/80 supports-[backdrop-filter]:backdrop-blur-xl border-r md:border-gray-200/60 md:dark:border-gray-800/60 border-gray-200 dark:border-gray-800 shadow-xl md:rounded-r-2xl rounded-none flex flex-col">

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="h-full flex flex-col p-6 pt-14 overflow-x-hidden"
              variants={contentVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h1 className="text-[20px] font-semibold tracking-tight text-gray-900 dark:text-white">Well Monitor</h1>
                <ThemeToggle />
              </div>

              {/* Tabs */}
              <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-4 mb-4 bg-secondary/70 dark:bg-secondary/50 p-1 rounded-lg text-[11px] md:text-[13px]">
                  <TabsTrigger className="data-[state=active]:bg-background dark:data-[state=active]:bg-background rounded-md text-[13px]" value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger className="data-[state=active]:bg-background dark:data-[state=active]:bg-background rounded-md text-[13px]" value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger className="data-[state=active]:bg-background dark:data-[state=active]:bg-background rounded-md text-[13px]" value="route">Route</TabsTrigger>
                  <TabsTrigger className="data-[state=active]:bg-background dark:data-[state=active]:bg-background rounded-md text-[13px]" value="chat">AI Chatbot</TabsTrigger>
                </TabsList>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search wells..."
                    value={searchQuery}
                    onFocus={()=> setShowSuggestions(true)}
                    onBlur={(e)=> {
                      // Delay closing to allow click
                      setTimeout(()=> setShowSuggestions(false), 120);
                    }}
                    onKeyDown={(e)=> {
                      if (e.key === 'Enter') {
                        if (filteredWells.length === 1) {
                          selectWell(filteredWells[0]);
                        } else if (filteredWells.length > 1) {
                          selectWell(filteredWells[0]);
                        }
                      }
                    }}
                    onChange={(e) => {setSearchQuery(e.target.value); setShowSuggestions(true);} }
                    className="pl-10 h-10 text-sm rounded-full border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-secondary/60 focus-visible:ring-0 focus:border-gray-300 dark:focus:border-gray-600"
                  />
                  {showSuggestions && searchQuery && filteredWells.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-900/95 border border-border/70 dark:border-border rounded-xl shadow-xl overflow-hidden z-40 animate-in fade-in-0 zoom-in-95">
                      <ul className="max-h-56 overflow-auto py-1 text-sm">
                        {filteredWells.map(w => (
                          <li key={w.id}>
                            <button
                              type="button"
                              onMouseDown={(e)=> e.preventDefault()}
                              onClick={()=> selectWell(w)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors ${selectedWell?.id===w.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
                            >
                              <span className="truncate pr-3">{w.name}</span>
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${w.status==='active'?'bg-emerald-400': w.status==='warning'?'bg-amber-400': w.status==='critical'?'bg-red-400':'bg-gray-400'}`}></span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <TabsContent value="dashboard" className="flex-1 overflow-auto space-y-4">
                  {/* Summary Metrics */}
                  {selectedWell && (
                    <>
                      <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
                        <CardHeader className="pb-1">
                          <CardTitle className="text-base font-semibold tracking-tight">{selectedWell.name}</CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Last updated: {selectedWell.data.lastUpdated.toLocaleTimeString()}
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 gap-2.5">
                            <MetricCard
                              label="pH Level"
                              value={selectedWell.data.ph.toFixed(1)}
                              unit=""
                              status={getMetricStatus(selectedWell.data.ph, 'ph')}
                              icon={<Gauge className="h-4 w-4" />}
                              onClick={() => setActiveChart('ph')}
                              isActive={activeChart === 'ph'}
                            />
                            <MetricCard
                              label="TDS"
                              value={Math.round(selectedWell.data.tds).toString()}
                              unit="ppm"
                              status={getMetricStatus(selectedWell.data.tds, 'tds')}
                              icon={<Droplets className="h-4 w-4" />}
                              onClick={() => setActiveChart('tds')}
                              isActive={activeChart === 'tds'}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <MetricCard
                              label="Temperature"
                              value={selectedWell.data.temperature.toFixed(1)}
                              unit="°C"
                              status={getMetricStatus(selectedWell.data.temperature, 'temperature')}
                              icon={<Thermometer className="h-4 w-4" />}
                              onClick={() => setActiveChart('temperature')}
                              isActive={activeChart === 'temperature'}
                            />
                            <MetricCard
                              label="Water Level"
                              value={selectedWell.data.waterLevel.toFixed(1)}
                              unit="m"
                              status={getMetricStatus(selectedWell.data.waterLevel, 'waterLevel')}
                              icon={<Activity className="h-4 w-4" />}
                              onClick={() => setActiveChart('waterLevel')}
                              isActive={activeChart === 'waterLevel'}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Chart Section */}
                      <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
                        <CardHeader className="pb-1">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold tracking-tight">24-Hour Trends</CardTitle>
                          </div>
                          <div className="mt-2 inline-flex bg-gray-100 dark:bg-gray-800 rounded-full p-1 w-full overflow-x-auto no-scrollbar">
                            {(['ph', 'tds', 'temperature', 'waterLevel', 'turbidity'] as const).map((metric) => {
                              const label = metric === 'ph' ? 'pH' : metric === 'tds' ? 'TDS' : metric === 'temperature' ? 'Temp' : metric === 'waterLevel' ? 'Level' : 'Turbidity';
                              const active = activeChart === metric;
                              return (
                                <button
                                  key={metric}
                                  onClick={() => setActiveChart(metric)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                    active
                                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow'
                                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3 pb-2">
                          <WellChart well={selectedWell} metric={activeChart} />
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Wells List */}
                  <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold tracking-tight">Wells Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1.5 max-h-56 overflow-auto pr-1 custom-scrollbar">
                        {filteredWells.map((well) => (
                          <motion.div
                            key={well.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              variant={selectedWell?.id === well.id ? 'default' : 'ghost'}
                              className="w-full justify-start px-3 py-2 h-auto rounded-lg text-sm"
                              onClick={() => selectWell(well)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="text-left">
                                  <p className="font-medium truncate leading-tight">{well.name}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                                    pH {well.data.ph.toFixed(1)} • TDS {Math.round(well.data.tds)}ppm
                                  </p>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${
                                  well.status === 'active' ? 'bg-green-500' :
                                  well.status === 'warning' ? 'bg-yellow-500' :
                                  well.status === 'critical' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`} />
                              </div>
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="flex-1 overflow-auto space-y-4">
                  <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold tracking-tight">System Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-tight">
                            {wells.length}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Wells</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-xl font-bold text-green-600 dark:text-green-400 leading-tight">
                            {wells.filter(w => w.status === 'active').length}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 leading-tight">
                            {wells.filter(w => w.status === 'warning').length}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Warning</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-xl font-bold text-red-600 dark:text-red-400 leading-tight">
                            {wells.filter(w => w.status === 'critical').length}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                        </div>
                      </div>
                      {/* Aggregate Averages */}
                      {wells.length > 0 && (
                        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                            <p className="text-[11px] uppercase font-medium tracking-wide text-gray-500 dark:text-gray-400">Avg pH</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{(wells.reduce((s,w)=>s+w.data.ph,0)/wells.length).toFixed(2)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                            <p className="text-[11px] uppercase font-medium tracking-wide text-gray-500 dark:text-gray-400">Avg TDS</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{Math.round(wells.reduce((s,w)=>s+w.data.tds,0)/wells.length)}<span className='text-xs font-normal ml-0.5'>ppm</span></p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                            <p className="text-[11px] uppercase font-medium tracking-wide text-gray-500 dark:text-gray-400">Avg Temp</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{(wells.reduce((s,w)=>s+w.data.temperature,0)/wells.length).toFixed(1)}<span className='text-xs font-normal ml-0.5'>°C</span></p>
                          </div>
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                            <p className="text-[11px] uppercase font-medium tracking-wide text-gray-500 dark:text-gray-400">Avg Level</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{(wells.reduce((s,w)=>s+w.data.waterLevel,0)/wells.length).toFixed(1)}<span className='text-xs font-normal ml-0.5'>m</span></p>
                          </div>
                        </div>
                      )}
                      {/* Distribution Bar */}
                      {wells.length > 0 && (
                        <div className="mt-6">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Status Distribution</p>
                          {(() => {
                            const counts = {
                              active: wells.filter(w=>w.status==='active').length,
                              warning: wells.filter(w=>w.status==='warning').length,
                              critical: wells.filter(w=>w.status==='critical').length,
                              offline: wells.filter(w=>w.status==='offline').length,
                            };
                            const total = wells.length || 1;
                            const seg = (c:number)=> (c/total)*100;
                            return (
                              <div className="w-full h-3 rounded-full overflow-hidden flex shadow-inner">
                                <div style={{ width: seg(counts.active)+'%' }} className="bg-emerald-500/80" />
                                <div style={{ width: seg(counts.warning)+'%' }} className="bg-amber-500/80" />
                                <div style={{ width: seg(counts.critical)+'%' }} className="bg-red-500/80" />
                                <div style={{ width: seg(counts.offline)+'%' }} className="bg-gray-400/70" />
                              </div>
                            );
                          })()}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-400">
                            <span><span className='inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1'></span>Active</span>
                            <span><span className='inline-block w-2 h-2 rounded-full bg-amber-500 mr-1'></span>Warning</span>
                            <span><span className='inline-block w-2 h-2 rounded-full bg-red-500 mr-1'></span>Critical</span>
                            <span><span className='inline-block w-2 h-2 rounded-full bg-gray-400 mr-1'></span>Offline</span>
                          </div>
                        </div>
                      )}
                      {selectedWell && (
                        <div className="mt-6">
                          <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Predictive Water Level ({selectedWell.name})</h3>
                          <PredictiveChart well={selectedWell} futureHours={12} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Route Planner Tab */}
                <TabsContent value="route" className="flex-1 overflow-auto space-y-4">
                  <RoutePlanner wells={wells} />
                </TabsContent>

                {/* AI Chatbot Tab */}
                <TabsContent
                  value="chat"
                  className="flex-1 min-h-0 p-0 data-[state=active]:flex data-[state=active]:flex-col"
                >
                  <AIChat />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// --- Helper Components Added Below ---
// (useEffect already imported at top)

interface RoutePlannerProps { wells: WellData[] }

function RoutePlanner({ wells }: RoutePlannerProps) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optLink, setOptLink] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [locTried, setLocTried] = useState(false);

  const toggleExcluded = (id: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      setLocTried(true);
      return;
    }
    setError(null);
    setLocTried(true);
    // Prefer a relaxed setting first (often faster), allow cached position up to 60s
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition(pos),
      (err) => {
        // Retry once with high accuracy and longer timeout if first attempt fails
        navigator.geolocation.getCurrentPosition(
          (pos2) => setPosition(pos2),
          (err2) => {
            // Friendly error, but we will still build a route without origin
            setError(err2.code === 1
              ? 'Location permission denied. We will still plan a route. Google Maps will use your current location.'
              : 'Could not get your location in time. We will still plan a route. You can also retry.');
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const activeWells = wells.filter(w => !excluded.has(w.id));
  const distances = position
    ? activeWells.map(w => ({
        well: w,
        distanceKm: haversine(position.coords.latitude, position.coords.longitude, w.location.lat, w.location.lng)
      }))
    : [];

  // Simple nearest-neighbor route (placeholder for full TSP) starting at user position
  const routeOrder = () => {
    if (activeWells.length === 0) return [] as { name: string; distanceFromPrev: number }[];
    const remaining = [...activeWells];
    // Start from device position if available, else use centroid of wells
    let startLat: number;
    let startLng: number;
    if (position) {
      startLat = position.coords.latitude;
      startLng = position.coords.longitude;
    } else {
      const sum = remaining.reduce((acc, w) => ({ lat: acc.lat + w.location.lat, lng: acc.lng + w.location.lng }), { lat: 0, lng: 0 });
      startLat = sum.lat / remaining.length;
      startLng = sum.lng / remaining.length;
    }
    let currentLat = startLat;
    let currentLng = startLng;
    const order: { name: string; distanceFromPrev: number }[] = [];
    while (remaining.length) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversine(currentLat, currentLng, remaining[i].location.lat, remaining[i].location.lng);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      order.push({ name: next.name, distanceFromPrev: bestDist === Infinity ? 0 : bestDist });
      currentLat = next.location.lat; currentLng = next.location.lng;
    }
    return order;
  };

  const order = routeOrder();
  const totalDistance = order.reduce((sum, o) => sum + o.distanceFromPrev, 0);

  useEffect(() => {
    if (order.length === 0) { setOptLink(null); return; }
    // Build Google Maps directions URL
    // If position unavailable, omit origin to let Google Maps use device location
    const coordsList: string[] = [];
    order.forEach(o => {
      const w = wells.find(wl => wl.name === o.name);
      if (w) coordsList.push(`${w.location.lat},${w.location.lng}`);
    });
    if (!coordsList.length) { setOptLink(null); return; }
    const destination = coordsList[coordsList.length - 1];
    const waypoints = coordsList.slice(0, -1).join('|');
    const base = 'https://www.google.com/maps/dir/?api=1';
    let url: string;
    if (position) {
      const origin = `${position.coords.latitude},${position.coords.longitude}`;
      url = waypoints
        ? `${base}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`
        : `${base}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    } else {
      url = waypoints
        ? `${base}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`
        : `${base}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    }
    setOptLink(url);
  }, [order, position, wells]);

  const estimatedMinutes = (totalDistance / 40) * 60; // crude avg 40km/h

  return (
  <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
      <CardHeader className="pb-2">
  <CardTitle className="text-base font-semibold tracking-tight">Route</CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400">Shortest greedy path suggestion with live distance. Open in Google Maps for navigation.</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!position && !error && (
          <div className="text-gray-500 dark:text-gray-400">Requesting location permission...</div>
        )}
        {error && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 space-y-1">
            <p>{error}</p>
            <div>
              <button
                type="button"
                onClick={requestLocation}
                className="mt-1 inline-flex items-center px-2.5 py-1 rounded-md border border-amber-400/40 text-amber-700 dark:text-amber-300 text-[11px] hover:bg-amber-500/10"
              >
                Retry location
              </button>
            </div>
          </div>
        )}
        {position && (
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Your Position: {position.coords.latitude.toFixed(5)}, {position.coords.longitude.toFixed(5)}
          </div>
        )}
        {/* Well selection list with exclusion checkboxes */}
        {wells.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Include Wells</p>
            <div className="space-y-1 max-h-40 overflow-auto pr-1">
              {wells.map(w => {
                const isExcluded = excluded.has(w.id);
                return (
                  <label key={w.id} className={`flex items-center justify-between text-xs rounded-md px-2 py-1 cursor-pointer select-none border border-transparent hover:border-gray-300/60 dark:hover:border-gray-700/60 transition-colors ${isExcluded ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                        checked={!isExcluded}
                        onChange={() => toggleExcluded(w.id)}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-200">{w.name}</span>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${w.status==='active'?'bg-emerald-400': w.status==='warning'?'bg-amber-400': w.status==='critical'?'bg-red-400':'bg-gray-400'}`}></span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {position && distances.length > 0 && (
          <div className="space-y-1">
            {distances.map(d => (
              <div key={d.well.id} className="flex items-center justify-between rounded-md px-2 py-1 bg-gray-100/70 dark:bg-gray-900/40">
                <span className="font-medium text-gray-800 dark:text-gray-200">{d.well.name}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{d.distanceKm.toFixed(2)} km</span>
              </div>
            ))}
          </div>
        )}
        {order.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Suggested Order</p>
            <ol className="space-y-1 list-decimal list-inside">
              {order.map((o, idx) => (
                <li key={idx} className="text-gray-700 dark:text-gray-300">
                  {o.name} <span className="text-xs text-gray-500 dark:text-gray-400">(+{o.distanceFromPrev.toFixed(2)} km)</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Total Distance: {totalDistance.toFixed(2)} km · Est Time: {estimatedMinutes.toFixed(0)} min</p>
            {optLink && (
              <a href={optLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow focus:outline-none focus:ring-2 focus:ring-emerald-400/50">
                Open in Google Maps
              </a>
            )}
          </div>
        )}
  {activeWells.length === 0 && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">Select at least one well to build a route.</div>
        )}
        {position && wells.length <= 1 && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Add more wells to compute multi-stop routes.</div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChatMessage { role: 'user' | 'assistant'; content: string }

function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [loadedHistory, setLoadedHistory] = useState(false);

  // Load history from Supabase via API (GET /api/chat), expanding rows with response into user+assistant pairs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/chat?limit=100');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.messages)) {
            const hist: ChatMessage[] = [];
            for (const m of json.messages) {
              const role = m.role === 'assistant' ? 'assistant' : 'user';
              const content = typeof m.content === 'string' ? m.content : '';
              const response = typeof m.response === 'string' ? m.response : '';
              if (role === 'assistant') {
                if (content) hist.push({ role: 'assistant', content });
              } else {
                if (content) hist.push({ role: 'user', content });
                if (response) hist.push({ role: 'assistant', content: response });
              }
            }
            if (hist.length === 0) {
              hist.push({ role: 'assistant', content: 'Hi! I\'m your EcoWell AI assistant. Ask me about water quality, recent trends, or request a summary.' });
            }
            setMessages(hist);
          }
        }
      } catch (e) {
        // ignore fetch errors (offline etc.)
      } finally {
        setLoadedHistory(true);
      }
    })();
  }, []);

  // Auto-scroll to bottom on new messages / streaming updates
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streaming]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const base = [...messages, userMessage];
    setMessages(base);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: base.slice(-10) })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.slice(0, 300));
      }
      const text = await res.text();
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + (e.message || 'unknown') }]);
    } finally {
      setStreaming(false);
    }
  };

  const stopStreaming = () => {};

  return (
  <Card className="bg-card/90 dark:bg-card/90 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 shadow-sm flex flex-col flex-1 min-h-0 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">AI Chatbot</CardTitle>
  <p className="text-xs text-gray-500 dark:text-gray-400">OpenRouter powered assistant. Streaming disabled for testing.</p>
      </CardHeader>
  <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-3 aichat-scroll-visible min-h-0 pb-24">
          {!loadedHistory && (
            <div className="text-xs text-gray-500 dark:text-gray-400">Loading history...</div>
          )}
          {messages.map((m, i) => {
            const isAssistant = m.role === 'assistant';
            return (
              <div key={i} className={`group rounded-xl px-3 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap break-words shadow-sm transition-colors ${!isAssistant ? 'ml-auto bg-primary text-primary-foreground hover:brightness-110' : 'bg-muted/70 dark:bg-muted/60 text-gray-800 dark:text-gray-200 hover:bg-muted dark:hover:bg-muted/80'}`}>
                {isAssistant ? (
                  <div className="prose prose-xs dark:prose-invert max-w-none prose-p:my-2 prose-pre:bg-gray-200 dark:prose-pre:bg-gray-800 prose-code:bg-gray-200 dark:prose-code:bg-gray-800 prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-a:text-blue-600 dark:prose-a:text-blue-400">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (m.content)}
              </div>
            );
          })}
          {/* Non-streaming mode: no live indicator */}
        </div>
  <div className="flex items-center gap-2 pt-2 border-t border-transparent dark:border-transparent mt-0 bg-transparent dark:bg-transparent rounded-none">
          <Input
            placeholder={streaming ? 'Streaming... press Stop' : 'Ask about pH, TDS, temp...'}
            value={input}
            disabled={streaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            className="h-10 text-sm rounded-full bg-muted/40 dark:bg-muted/30 border border-border dark:border-gray-700 focus-visible:ring-0 disabled:opacity-60 flex-1 backdrop-blur-sm"
          />
          <Button onClick={sendMessage} disabled={!input.trim() || streaming} className="rounded-full h-10 px-5 text-sm font-medium shadow-sm">{streaming ? 'Sending…' : 'Send'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}