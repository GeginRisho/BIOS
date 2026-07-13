'use client';

import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useRef } from 'react';
const L = typeof window !== 'undefined' ? require('leaflet') : null;
import { Globe } from 'lucide-react';
import { SEED_COMPANIES, SeedCompany } from '../lib/seed_data';

// Continent coordinates and names (Correctly spelled in English)
const CONTINENTS = [
  { name: "AFRICA", coords: [0.0, 20.0] },
  { name: "EUROPE", coords: [50.0, 15.0] },
  { name: "ASIA", coords: [45.0, 90.0] },
  { name: "NORTH AMERICA", coords: [40.0, -100.0] },
  { name: "SOUTH AMERICA", coords: [-15.0, -60.0] },
  { name: "AUSTRALIA", coords: [-25.0, 135.0] },
  { name: "ANTARCTICA", coords: [-75.0, 0.0] }
];

// Major ocean and country English label mappings
const REGIONS = [
  { name: "NORTH ATLANTIC OCEAN", coords: [30.0, -40.0], type: "ocean" },
  { name: "SOUTH ATLANTIC OCEAN", coords: [-30.0, -15.0], type: "ocean" },
  { name: "PACIFIC OCEAN", coords: [0.0, -140.0], type: "ocean" },
  { name: "INDIAN OCEAN", coords: [-20.0, 80.0], type: "ocean" },
  { name: "UNITED STATES", coords: [38.0, -97.0], type: "country" },
  { name: "CHINA", coords: [35.0, 105.0], type: "country" },
  { name: "GERMANY", coords: [51.0, 9.0], type: "country" },
  { name: "INDIA", coords: [20.0, 78.0], type: "country" },
  { name: "UNITED KINGDOM", coords: [55.0, -3.0], type: "country" },
  { name: "JAPAN", coords: [36.0, 138.0], type: "country" },
  { name: "BRAZIL", coords: [-10.0, -53.0], type: "country" },
  { name: "SOUTH AFRICA", coords: [-30.0, 25.0], type: "country" }
];


// Helper to generate hundreds of small glowing nodes
const generateScatterNodes = () => {
  const scatter: any[] = [];
  const capitals = [
    [55.7558, 37.6173], [35.6762, 139.6503], [-33.8688, 151.2093], [39.9042, 116.4074],
    [-23.5505, -46.6333], [19.4326, -99.1332], [30.0444, 31.2357], [48.8566, 2.3522],
    [41.9028, 12.4964], [52.5200, 13.4050], [22.3193, 114.1694], [31.2304, 121.4737],
    [5.5600, -0.2000], [9.0820, 8.6753], [-1.2921, 36.8219], [33.6844, 73.0479],
    [13.7563, 100.5018], [-6.2088, 106.8456], [3.1390, 101.6869], [-26.2041, 28.0473],
    [45.4215, -75.6972], [-34.6037, -58.3816], [-12.0464, -77.0428], [37.5665, 126.9780]
  ];
  
  capitals.forEach((base, idx) => {
    for (let i = 0; i < 3; i++) {
      const latOffset = (Math.random() - 0.5) * 6;
      const lngOffset = (Math.random() - 0.5) * 6;
      scatter.push({
        id: `scatter-${idx}-${i}`,
        coords: [base[0] + latOffset, base[1] + lngOffset],
        intensity: Math.random() * 0.4 + 0.2
      });
    }
  });
  return scatter;
};

const SCATTER_NODES = generateScatterNodes();

interface MapProps {
  onSelectBusiness: (biz: any) => void;
  selectedId: string | null;
  businesses?: any[];
  mobileMenuOpen?: boolean;
}

export default function PlanetaryMap({ onSelectBusiness, selectedId, businesses, mobileMenuOpen }: MapProps) {
  const activeBusinesses = businesses && businesses.length > 0 ? businesses : SEED_COMPANIES;
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Disable all map interactions when mobile drawer is open to prevent touch event leaks
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (mobileMenuOpen) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [mobileMenuOpen, mapInitialized]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const connectionsRef = useRef<L.LayerGroup | null>(null);

  // Helper to extract valid coordinates from either `coords` array or `latitude`/`longitude` fields
  const getCoords = (biz: any): [number, number] | null => {
    if (!biz) return null;
    if (biz.coords && Array.isArray(biz.coords) && biz.coords.length === 2) {
      const lat = biz.coords[0];
      const lng = biz.coords[1];
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    if (typeof biz.latitude === 'number' && typeof biz.longitude === 'number') {
      const lat = biz.latitude;
      const lng = biz.longitude;
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null;
  };

  const lastAnimatedIdRef = useRef<string | null>(selectedId);

  // Sync selected business when selectedId changes, triggering smooth flyTo animation
  useEffect(() => {
    const matched = selectedId ? activeBusinesses.find(b => b.id === selectedId || b.name === selectedId) : null;
    const coords = matched ? getCoords(matched) : null;

    if (matched) {
      setSelectedBiz(matched);
    } else {
      setSelectedBiz(null);
    }

    if (!mapRef.current || !mapInitialized) return;

    const isNewChange = selectedId !== lastAnimatedIdRef.current;
    lastAnimatedIdRef.current = selectedId;

    if (matched && coords) {
      if (isNewChange) {
        try {
          mapRef.current.invalidateSize();
          mapRef.current.flyTo(coords as L.LatLngExpression, 5, {
            animate: true,
            duration: 1.5
          });
        } catch (err) {
          console.error("Leaflet flyTo error:", err);
        }
      } else {
        try {
          mapRef.current.invalidateSize();
          mapRef.current.setView(coords as L.LatLngExpression, 5, { animate: false });
        } catch (err) {
          console.error("Leaflet setView error:", err);
        }
      }
    } else {
      if (isNewChange) {
        try {
          mapRef.current.invalidateSize();
          const bounds: L.LatLngTuple[] = [];
          activeBusinesses.forEach(biz => {
            const c = getCoords(biz);
            if (c) bounds.push(c as L.LatLngTuple);
          });
          if (bounds.length > 0) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        } catch (err) {
          console.error("Leaflet fitBounds error:", err);
        }
      } else {
        try {
          mapRef.current.invalidateSize();
          const bounds: L.LatLngTuple[] = [];
          activeBusinesses.forEach(biz => {
            const c = getCoords(biz);
            if (c) bounds.push(c as L.LatLngTuple);
          });
          if (bounds.length > 0) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
          } else {
            mapRef.current.setView([20, 10], 2, { animate: false });
          }
        } catch (err) {
          console.error("Leaflet fitBounds static error:", err);
        }
      }
    }
  }, [selectedId, activeBusinesses, mapInitialized]);

  // Invalidate map size whenever selection/sidebar visibility changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 300);
    }
  }, [selectedBiz]);

  // Resize and Orientation change event listener to invalidate map dimensions
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Map Initialization & Resize Observer
  useEffect(() => {
    if (!containerRef.current || !L) return;

    let mapInstance: L.Map | null = null;
    let observer: ResizeObserver | null = null;

    const initMap = () => {
      if (!containerRef.current || mapRef.current) return;

      if ((containerRef.current as any)._leaflet_id) {
        delete (containerRef.current as any)._leaflet_id;
      }

      mapInstance = L.map(containerRef.current, {
        center: [20, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: true
      });
      mapRef.current = mapInstance;

      // Carto light-themed tile layer (no labels)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(mapInstance);

      markersRef.current = L.layerGroup().addTo(mapInstance);
      connectionsRef.current = L.layerGroup().addTo(mapInstance);

      mapInstance.on('zoomend', () => {
        if (mapInstance) {
          setCurrentZoom(mapInstance.getZoom());
        }
      });

      setMapInitialized(true);

      // Call invalidateSize after a tick to resolve any initial boundary glitches
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 50);
    };

    // Monitor map container dimension changes
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            if (!mapRef.current) {
              initMap();
            } else {
              mapRef.current.invalidateSize();
            }
          }
        }
      });
      observer.observe(containerRef.current);
    } else {
      initMap();
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;
      }
      if (containerRef.current) {
        delete (containerRef.current as any)._leaflet_id;
      }
      setMapInitialized(false);
    };
  }, []);

  // Helper to determine marker category color & icon based on relationship to selected company
  const getMarkerOptions = (biz: any, isSelected: boolean) => {
    let color = "#0D9488"; // default dark teal (Nearby)
    let symbol = "🏢";
    let typeName = "Entity / Office";

    if (isSelected) {
      color = "#EF4444"; // red (Selected Target)
      symbol = "🎯";
      typeName = "Selected Target";
      return { color, symbol, typeName };
    }

    if (selectedBiz) {
      const name = biz.name;
      // Core Supplier -> teal
      if (selectedBiz.suppliers?.some((s: string) => s.includes(name) || name.includes(s))) {
        color = "#14B8A6"; // teal
        symbol = "📦";
        typeName = "Core Supplier";
      } 
      // Market Competitor -> orange
      else if (selectedBiz.competitors?.some((c: string) => c.includes(name) || name.includes(c))) {
        color = "#F97316"; // orange
        symbol = "⚔️";
        typeName = "Market Competitor";
      } 
      // Strategic Partner -> green
      else if (selectedBiz.partners?.some((p: string) => p.includes(name) || name.includes(p))) {
        color = "#10B981"; // green
        symbol = "🤝";
        typeName = "Strategic Partner";
      }
    }

    return { color, symbol, typeName };
  };

  // Sync interactive markers & connections on data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!mapInitialized || !map || !markersRef.current || !connectionsRef.current) return;

    markersRef.current.clearLayers();
    connectionsRef.current.clearLayers();

    // 1. Draw custom English continent and region/ocean labels
    CONTINENTS.forEach((cont) => {
      L.marker(cont.coords as L.LatLngExpression, {
        icon: L.divIcon({
          className: 'custom-leaflet-continent-label',
          html: `<div class="text-[10px] font-extrabold text-slate-400/90 tracking-widest uppercase select-none pointer-events-none font-mono whitespace-nowrap">${cont.name}</div>`,
          iconSize: [120, 20],
          iconAnchor: [60, 10]
        }),
        zIndexOffset: -100
      }).addTo(connectionsRef.current!);
    });

    REGIONS.forEach((reg) => {
      const isOcean = reg.type === "ocean";
      const fontClass = isOcean 
        ? "text-slate-300/80 italic font-medium tracking-widest text-[9px]" 
        : "text-slate-400/70 font-semibold tracking-wider text-[8px]";
      
      L.marker(reg.coords as L.LatLngExpression, {
        icon: L.divIcon({
          className: isOcean ? 'custom-leaflet-ocean-label' : 'custom-leaflet-country-label',
          html: `<div class="${fontClass} select-none pointer-events-none uppercase whitespace-nowrap">${reg.name}</div>`,
          iconSize: [150, 20],
          iconAnchor: [75, 10]
        }),
        zIndexOffset: -120
      }).addTo(connectionsRef.current!);
    });

    // 2. Render markers & connections (only selectedBiz and its ecosystem, or ALL businesses if none is selected)
    const displayMarkers: any[] = [];
    const selectedCoords = getCoords(selectedBiz);

    if (selectedBiz && selectedCoords) {
      displayMarkers.push(selectedBiz);

      // Get connected businesses
      const connectedBusinesses = activeBusinesses.filter((biz) => {
        if (biz.id === selectedBiz.id) return false;
        const coords = getCoords(biz);
        if (!coords) return false;
        
        const { typeName } = getMarkerOptions(biz, false);
        return typeName === "Core Supplier" || typeName === "Market Competitor" || typeName === "Strategic Partner";
      });

      displayMarkers.push(...connectedBusinesses);

      // Draw relationship flows (lines connect exactly to marker center points)
      connectedBusinesses.forEach((biz) => {
        const { color, symbol, typeName } = getMarkerOptions(biz, false);
        const isCompetitor = typeName === "Market Competitor";
        const targetCoords = getCoords(biz);
        if (!selectedCoords || !targetCoords) return;
        
        // Draw center-bound line connecting exactly to marker anchors
        L.polyline([selectedCoords, targetCoords], {
          color: color,
          weight: 2.2,
          opacity: 0.75,
          dashArray: isCompetitor ? '4, 4' : undefined
        }).addTo(connectionsRef.current!);

        // Draw mid-line direction badge with distance & travel time
        const midLat = (selectedCoords[0] + targetCoords[0]) / 2;
        const midLng = (selectedCoords[1] + targetCoords[1]) / 2;
        const dist = L.latLng(selectedCoords).distanceTo(L.latLng(targetCoords));
        const distKm = Math.round(dist / 1000);
        const isAir = distKm > 2500;
        const speed = isAir ? 850 : 50; 
        const travelHrs = Math.round((distKm / speed) * 10) / 10;

        L.marker([midLat, midLng] as L.LatLngExpression, {
          icon: L.divIcon({
            className: 'custom-leaflet-line-badge',
            html: `
              <div class="bg-slate-900 text-white border border-slate-700/80 px-2 py-0.5 rounded text-[8px] font-bold shadow-md flex items-center space-x-1 whitespace-nowrap">
                <span>${isAir ? '✈️' : '🚢'} ${distKm}km</span>
                <span class="text-indigo-300 font-mono">(${travelHrs}h)</span>
              </div>
            `,
            iconSize: [85, 18],
            iconAnchor: [42, 9]
          })
        }).addTo(connectionsRef.current!);
      });
    } else {
      // If no business selected, display ALL active businesses on the map
      activeBusinesses.forEach((biz) => {
        const coords = getCoords(biz);
        if (coords) {
          displayMarkers.push(biz);
        }
      });
    }

    // 5. Render markers
    displayMarkers.forEach((biz) => {
      let marker: L.Marker;
      const isSelected = selectedBiz?.id === biz.id;
      const coords = getCoords(biz);
      if (!coords) return;

      const { color, symbol, typeName } = getMarkerOptions(biz, isSelected);

      const customIcon = L.divIcon({
        className: 'custom-leaflet-saas-icon',
        html: `
          <div class="w-[44px] h-[44px] flex items-center justify-center cursor-pointer pointer-events-auto">
            <div style="background-color: ${color};" class="relative rounded-full border-2 border-white shadow-md flex items-center justify-center text-white select-none transition hover:scale-125 duration-150 ${
              isSelected ? 'w-10 h-10 text-base animate-bounce' : 'w-7 h-7 text-xs'
            }">
              ${symbol}
              ${isSelected ? '<span class="absolute -inset-2 rounded-full border border-red-500/80 animate-ping opacity-60 pointer-events-none"></span>' : ''}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      marker = L.marker(coords, { icon: customIcon });

      // Tooltip showing company name on hover
      marker.bindTooltip(`
        <div class="px-2 py-1 font-sans bg-slate-900 border border-slate-800 text-white rounded-lg shadow-xl text-[9px] font-bold leading-normal select-none pointer-events-none">
          <div class="text-white flex items-center space-x-1.5">
            <span style="background-color: ${color};" class="w-1.5 h-1.5 rounded-full inline-block"></span>
            <span>${biz.name}</span>
          </div>
          <div class="text-slate-400 text-[8px] mt-0.5">${biz.city}, ${biz.country}</div>
        </div>
      `, {
        permanent: isSelected,
        direction: 'top',
        offset: [0, -14],
        className: 'custom-permanent-tooltip'
      });

      // Click Popup with complete information
      const popupContent = `
        <div class="p-2.5 font-sans min-w-[150px]">
          <h4 class="font-bold text-xs text-slate-900">${biz.name}</h4>
          <p class="text-[9px] text-slate-400 font-semibold mt-0.5">${biz.city}, ${biz.country}</p>
          <div class="mt-2 text-[9px] font-extrabold uppercase tracking-wide text-indigo-600 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded inline-block">
            ${typeName}
          </div>
          <p class="text-[10px] text-slate-500 mt-1.5"><strong>Industry:</strong> ${biz.industry}</p>
          <p class="text-[10px] text-slate-500"><strong>Revenue:</strong> ${biz.revenue ?? "N/A"}</p>
          <p class="text-[10px] text-slate-500"><strong>Risk Score:</strong> ${biz.risk ?? 15}%</p>
        </div>
      `;
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedBiz(biz);
        onSelectBusiness(biz);
      });

      marker.addTo(markersRef.current!);
    });

  }, [activeBusinesses, selectedBiz, onSelectBusiness, currentZoom, selectedId, mapInitialized]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[550px]">
      
      <style>{`
        .leaflet-tooltip.custom-permanent-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip-top.custom-permanent-tooltip::before {
          border-top-color: #0f172a !important;
        }
        .custom-leaflet-continent-label,
        .custom-leaflet-ocean-label,
        .custom-leaflet-country-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* MAP VIEWER PORT (3 Cols) */}
      <div className="xl:col-span-3 rounded-3xl overflow-hidden border border-slate-200/80 bg-slate-50 relative h-[360px] md:h-[420px] xl:h-full shadow-inner w-full max-w-full">
        <div ref={containerRef} style={{ width: '100%', height: '100%', maxWidth: '100%', touchAction: 'none' }} />

        {/* Floating Expandable Legend Button */}
        <div className="absolute bottom-4 left-4 z-[999] flex flex-col items-start select-none">
          {showLegend && (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 px-4 py-3 rounded-xl shadow-lg text-[10px] mb-2 animate-in slide-in-from-bottom-2 duration-150">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-2 font-mono">Relationship Legend</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600 font-semibold">
                <div className="flex items-center space-x-2">
                  <span>🎯</span> <span className="text-red-500 font-bold">Selected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🏢</span> <span className="text-blue-500">Nearby/Other</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🤝</span> <span className="text-emerald-600 font-bold">Partners (Green)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>⚔️</span> <span className="text-orange-500 font-bold">Competitors (Orange)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📦</span> <span className="text-purple-600 font-bold">Suppliers (Purple)</span>
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl shadow-md text-slate-600 hover:text-slate-900 transition flex items-center justify-center space-x-1.5 text-[10px] font-bold pointer-events-auto h-11 px-4 cursor-pointer"
          >
            <span>🗺️</span>
            <span>{showLegend ? 'Hide Legend' : 'Show Legend'}</span>
          </button>
        </div>
      </div>

      {/* DETAILED DRILLDOWN PANEL (1 Col - Hidden on mobile if no business is selected) */}
      <div className={`xl:col-span-1 rounded-3xl p-5 flex flex-col justify-between bg-white border border-slate-200/80 overflow-y-auto shadow-sm ${!selectedBiz ? 'hidden xl:flex' : 'flex'} h-auto xl:h-full`}>
        {selectedBiz ? (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Header Avatar and Branding */}
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-extrabold shadow-sm select-none shrink-0">
                  {selectedBiz.name ? selectedBiz.name.charAt(0) : "?"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold text-slate-900 leading-tight truncate">
                    {selectedBiz.name}
                  </h3>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded inline-block mt-1 font-mono">
                    {selectedBiz.industry ?? "Technology"}
                  </span>
                </div>
              </div>

              {/* Ingestion status summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 mt-3">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Briefing Description</span>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {selectedBiz.description ?? "Operational parameters sync complete with local directory database."}
                </p>
              </div>

              {/* Health Meter progress bar */}
              <div className="space-y-1 mt-3.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>Ecosystem Health Index</span>
                  <span className="text-emerald-600 font-mono">{selectedBiz.healthIndex ?? 85}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/30">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${selectedBiz.healthIndex ?? 85}%` }}
                  />
                </div>
              </div>

              {/* Identity & Corporate metadata grid */}
              <div className="grid grid-cols-2 gap-3 text-[11px] border-t border-slate-100 pt-3.5 mt-3.5">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">CEO</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">{selectedBiz.ceo ?? "Unknown CEO"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Founded</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">{selectedBiz.founded ?? "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Employees</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">{selectedBiz.employees ?? "1,200"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Headquarters</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {selectedBiz.city ?? "Silicon Valley"}, {selectedBiz.country ?? "USA"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Revenue</span>
                  <span className="font-bold text-slate-800 font-mono mt-0.5">{selectedBiz.revenue ? `$${selectedBiz.revenue}B` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Market Cap</span>
                  <span className="font-bold text-indigo-600 font-mono mt-0.5">{selectedBiz.marketCap ? `$${selectedBiz.marketCap}B` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Risk Score</span>
                  <span className="font-bold text-red-500 font-mono mt-0.5">{selectedBiz.risk ?? 15}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Status</span>
                  <span className="font-semibold text-emerald-600 truncate block mt-0.5">{selectedBiz.status ?? "Verified Twin"}</span>
                </div>
              </div>
            </div>

            {/* External website link */}
            <div className="border-t border-slate-100 pt-3.5 mt-3.5">
              <span className="text-[9px] text-slate-400 block mb-1 uppercase font-bold tracking-wider">Digital Twin Portal</span>
              {selectedBiz.website ? (
                <a 
                  href={selectedBiz.website} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-indigo-500 hover:underline inline-block font-semibold"
                >
                  {selectedBiz.website.replace('https://', '').replace('http://', '')}
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">No URL linked</span>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl">
            <Globe className="w-10 h-10 text-slate-300 animate-pulse mb-3" />
            <p className="text-xs text-slate-400 font-medium">Select a business to view its Digital Twin.</p>
          </div>
        )}
      </div>

    </div>
  );
}
