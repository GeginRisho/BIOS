import { create } from 'zustand';

interface User {
  email: string;
  role: string;
  token: string;
}

interface BIOSStore {
  user: User | null;
  activeView: string; // 'map', 'graph', 'predictions', 'chat', 'reports', 'settings'
  selectedBusinessId: string | null;
  selectedBusinessName: string | null;
  crawlerStatus: string;
  activeWorkers: number;
  globalTwinCount: number;
  setUser: (user: User | null) => void;
  setActiveView: (view: string) => void;
  setSelectedBusiness: (id: string | null, name: string | null) => void;
  updateCrawlerMetrics: (status: string, workers: number, twins: number) => void;
}

export const useBIOSStore = create<BIOSStore>((set) => ({
  user: null,
  activeView: 'map',
  selectedBusinessId: null,
  selectedBusinessName: null,
  crawlerStatus: 'active',
  activeWorkers: 18,
  globalTwinCount: 14209581,
  setUser: (user) => set({ user }),
  setActiveView: (activeView) => set({ activeView }),
  setSelectedBusiness: (id, name) => set({ selectedBusinessId: id, selectedBusinessName: name }),
  updateCrawlerMetrics: (crawlerStatus, activeWorkers, globalTwinCount) => 
    set({ crawlerStatus, activeWorkers, globalTwinCount })
}));
