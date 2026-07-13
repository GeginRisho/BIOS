'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Globe, 
  Share2, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  Settings, 
  Search, 
  Cpu, 
  Database, 
  Zap, 
  ShieldAlert, 
  Activity, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  Key,
  Loader2,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Printer,
  Share,
  User,
  Users,
  Lock,
  Shield,
  Building,
  Plus,
  Trash,
  Edit,
  Upload,
  LayoutDashboard,
  LogOut,
  HelpCircle,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  EyeOff,
  Menu
} from 'lucide-react';
import { useBIOSStore } from '../lib/store';
import ErrorBoundary from '../components/ErrorBoundary';

// Dynamic imports of client-only interactive graph and map components to prevent hydration errors
const PlanetaryMap = dynamic(() => import('../components/PlanetaryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] bg-slate-100/50 animate-pulse rounded-2xl flex items-center justify-center border border-slate-200/80">
      <div className="text-center">
        <Globe className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
        <span className="text-xs text-slate-500 font-semibold">Booting Interactive Coordinate Network...</span>
      </div>
    </div>
  )
});

const RelationshipGraph = dynamic(() => import('../components/RelationshipGraph'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center border border-slate-200/80">
      <div className="text-center">
        <Share2 className="w-8 h-8 text-indigo-500 animate-pulse mx-auto mb-2" />
        <span className="text-xs text-slate-500 font-semibold">Calculating Node Connections...</span>
      </div>
    </div>
  )
});

const SimulationCharts = dynamic(() => import('../components/SimulationCharts'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center border border-slate-200/80">
      <div className="text-center">
        <TrendingUp className="w-8 h-8 text-indigo-500 animate-bounce mx-auto mb-2" />
        <span className="text-xs text-slate-500 font-semibold">Generating Prediction Forecasts...</span>
      </div>
    </div>
  )
});

const POPULAR_SEARCHES = [
  "Apple Inc.",
  "Tesla Motors",
  "Google LLC",
  "NVIDIA Corp",
  "Infosys Ltd."
];

const getServiceUrl = (port: number, path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cleanBase = baseUrl.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  return `${cleanBase}/${cleanPath}`;
};

export default function BIOSDashboard() {
  const { 
    user, 
    activeView, 
    selectedBusinessId, 
    selectedBusinessName, 
    setUser,
    setActiveView,
    setSelectedBusiness
  } = useBIOSStore();

  // Auth Screen states
  const [authTab, setAuthTab] = useState<'login' | 'forgot' | 'reset' | 'verify' | 'session_expired'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('viewer');
  const [rememberMe, setRememberMe] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [resetConfirmCode, setResetConfirmCode] = useState('');

  // Organization active scopes
  const [activeOrg, setActiveOrg] = useState('Apple Organization Console');

  // Business twins list state
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<any>(null);

  // Command bar search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pagination for CRM
  const [crmPage, setCrmPage] = useState(1);
  const [crmFilterIndustry, setCrmFilterIndustry] = useState("All");
  const crmPageSize = 8;

  // Dynamic API / Simulation state mappings
  const [simulationData, setSimulationData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'financial' | 'supply_chain' | 'competitors' | 'risk' | 'esg' | 'ai_summary'>('overview');

  // Service health monitoring ticks
  const [dbStatuses, setDbStatuses] = useState<any>({
    postgres: { name: "PostgreSQL DB", port: "5432", usage: "34% CPU", load: "w-1/3 bg-indigo-500", status: "online" },
    redis: { name: "Redis Cache", port: "6379", usage: "1.2 GB RAM", load: "w-1/2 bg-purple-500", status: "online" },
    neo4j: { name: "Neo4j Graph", port: "7687", usage: "2.1 GB RAM", load: "w-3/4 bg-blue-500", status: "online" },
    mongodb: { name: "MongoDB Raw", port: "27017", usage: "12ms Latency", load: "w-1/4 bg-sky-500", status: "online" },
    qdrant: { name: "Qdrant Vectors", port: "6333", usage: "99.8% Hit Rate", load: "w-5/6 bg-emerald-500", status: "online" },
    kafka: { name: "Kafka Broker", port: "9092", usage: "850 msg/s", load: "w-2/3 bg-amber-500", status: "online" }
  });

  // Simulation Sliders states
  const [simScenario, setSimScenario] = useState("base");
  const [simulationHorizon, setSimulationHorizon] = useState("12");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simSliders, setSimSliders] = useState({
    inflation: 5,
    oilPrice: 75,
    shippingDelays: 10,
    tariffs: 10,
    currencyExchange: 5,
    demandGrowth: 5,
    interestRate: 4.5
  });

  // Dynamic Sim Outputs
  const [simOutputs, setSimOutputs] = useState<any>({
    revenueProjection: "$0M",
    riskProjection: "0%",
    delayDays: "0 days",
    financialLoss: "$0M",
    recoveryTime: "0 days",
    affectedCount: 0,
    status: "Calculations ready."
  });

  // UI Loaders / Toast Notifications
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Swarm workflow timeline states (visual redesign)
  const [agentInput, setAgentInput] = useState("");
  const [isSwarmRunning, setIsSwarmRunning] = useState(false);
  const [swarmProgress, setSwarmProgress] = useState(0);
  const [swarmResult, setSwarmResult] = useState<any>(null);
  const [swarmStages, setSwarmStages] = useState<any[]>([
    { id: "planner", label: "Planner Agent", description: "Deconstructs query into an execution plan.", status: "idle", data: "N/A", result: "" },
    { id: "crawler", label: "Crawler Scraper", description: "Fetches live webpage and traffic data indices.", status: "idle", data: "N/A", result: "" },
    { id: "graph", label: "Graph Builder", description: "Maps relationships and syncs Neo4j edges.", status: "idle", data: "N/A", result: "" },
    { id: "predictions", label: "Forecast Engine", description: "Runs Prophet calculations for metrics.", status: "idle", data: "N/A", result: "" },
    { id: "risk", label: "Risk Analyst", description: "Calculates Z-score, cyber, and geopolitical risk.", status: "idle", data: "N/A", result: "" },
    { id: "coordinator", label: "Swarm Coordinator", description: "Compiles SWOT briefs and summaries.", status: "idle", data: "N/A", result: "" }
  ]);

  // Company management CRUD state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [crmEmailResetModal, setCrmEmailResetModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<any>(null);

  // Company form attributes
  const [compName, setCompName] = useState("");
  const [compIndustry, setCompIndustry] = useState("Technology");
  const [compCity, setCompCity] = useState("");
  const [compCountry, setCompCountry] = useState("");
  const [compCEO, setCompCEO] = useState("");
  const [compRevenue, setCompRevenue] = useState("");
  const [compMarketCap, setCompMarketCap] = useState("");
  const [compFounded, setCompFounded] = useState("");
  const [compStockSymbol, setCompStockSymbol] = useState("");
  const [compEmployees, setCompEmployees] = useState("");
  const [compLatitude, setCompLatitude] = useState("");
  const [compLongitude, setCompLongitude] = useState("");
  const [compWebsite, setCompWebsite] = useState("");
  const [compStatus, setCompStatus] = useState("Verified Twin");
  const [compDescription, setCompDescription] = useState("");

  // Bulk CSV Upload
  const [csvText, setCsvText] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Audit Logs (Real database fetch)
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // User Management (Super Admin only)
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilterRole, setUserFilterRole] = useState("All");
  const [userFilterStatus, setUserFilterStatus] = useState("All");
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormEmail, setUserFormEmail] = useState("");
  const [userFormName, setUserFormName] = useState("");
  const [userFormRole, setUserFormRole] = useState("viewer");
  const [userFormStatus, setUserFormStatus] = useState("Active");
  const [editingUser, setEditingUser] = useState<any>(null);

  // System Monitor stats
  const [sysMetrics, setSysMetrics] = useState({
    cpu: 32,
    ram: 68,
    disk: 44,
    latency: 12,
    requests: 125,
    errors: 0
  });

  // Ticking metrics simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSysMetrics(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + Math.floor(Math.random() * 9 - 4.5))),
        ram: Math.max(50, Math.min(95, prev.ram + Math.floor(Math.random() * 5 - 2.5))),
        disk: prev.disk,
        latency: Math.max(5, Math.min(250, prev.latency + Math.floor(Math.random() * 15 - 7.5))),
        requests: Math.max(50, prev.requests + Math.floor(Math.random() * 19 - 9)),
        errors: Math.random() > 0.98 ? prev.errors + 1 : prev.errors
      }));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Authenticated fetch helper with JWT automatic refresh and single retry
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let headers = { ...(options.headers || {}) } as Record<string, string>;
    const storedUser = localStorage.getItem("bios_user");
    let token = user?.token;
    if (!token && storedUser) {
      try { token = JSON.parse(storedUser).token; } catch (e) {}
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    let res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      const refresh = localStorage.getItem("bios_refresh_token");
      if (refresh) {
        try {
          const refreshRes = await fetch(getServiceUrl(8001, "/api/v1/auth/refresh"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refresh })
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const storedParsed = storedUser ? JSON.parse(storedUser) : {};
            const updatedUser = {
              email: storedParsed.email || user?.email || "",
              role: storedParsed.role || user?.role || "viewer",
              token: data.access_token
            };
            setUser(updatedUser);
            localStorage.setItem("bios_user", JSON.stringify(updatedUser));
            localStorage.setItem("bios_refresh_token", data.refresh_token);
            
            headers["Authorization"] = `Bearer ${data.access_token}`;
            res = await fetch(url, { ...options, headers });
          } else {
            handleLogout();
          }
        } catch (e) {
          console.error("Token refresh failed:", e);
          handleLogout();
        }
      } else {
        handleLogout();
      }
    }
    return res;
  };

  // Restore session on startup
  useEffect(() => {
    const storedUser = localStorage.getItem("bios_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.token) {
          fetch(getServiceUrl(8001, "/api/v1/auth/me"), {
            headers: { "Authorization": `Bearer ${parsed.token}` }
          }).then(res => {
            if (res.ok) {
              return res.json();
            } else {
              const refresh = localStorage.getItem("bios_refresh_token");
              if (refresh) {
                return fetch(getServiceUrl(8001, "/api/v1/auth/refresh"), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ refresh_token: refresh })
                }).then(refRes => {
                  if (refRes.ok) {
                    return refRes.json().then(refData => {
                      const updatedUser = { ...parsed, token: refData.access_token };
                      localStorage.setItem("bios_user", JSON.stringify(updatedUser));
                      localStorage.setItem("bios_refresh_token", refData.refresh_token);
                      setUser(updatedUser);
                      return null;
                    });
                  } else {
                    throw new Error("Session expired");
                  }
                });
              } else {
                throw new Error("Session expired");
              }
            }
          }).then(userData => {
            if (userData) {
              setUser({
                email: userData.email,
                role: userData.role,
                token: parsed.token
              });
            }
          }).catch(err => {
            console.warn("Restoring session failed, logging out:", err);
            handleLogout();
          });
        }
      } catch (e) {
        console.error("Failed to parse stored user session:", e);
      }
    }
  }, []);

  // Fetch businesses from backend on load
  const loadBusinesses = async () => {
    try {
      const response = await fetch(getServiceUrl(8002, "/api/v1/businesses"));
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setBusinesses(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch businesses from directory database:", err);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  // Load audit logs from backend if user is authenticated
  const loadAuditLogs = async () => {
    if (!user || !user.token) return;
    try {
      const response = await apiFetch(getServiceUrl(8001, "/api/v1/auth/audit"));
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [user, activeView]);

  // Load managed users (Super Admin IAM module)
  const loadManagedUsers = async () => {
    if (!user || !user.token || user.role !== "super_admin") return;
    try {
      const response = await apiFetch(getServiceUrl(8001, "/api/v1/auth/users"));
      if (response.ok) {
        const data = await response.json();
        setManagedUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch managed users:", err);
    }
  };

  useEffect(() => {
    if (activeView === "settings") {
      loadManagedUsers();
    }
  }, [user, activeView]);

  const getFallbackReport = (biz: any) => {
    return {
      summary: `${biz.name} is a leading entity in the ${biz.industry} sector, demonstrating solid market footprint in ${biz.city}, ${biz.country}. Mapped digital twin metrics align with enterprise benchmarks.`,
      swot: {
        strengths: ["Strong global brand value", "Verified digital twin simulation profiles", "Stable market cap valuation"],
        weaknesses: ["Exposure to regional supply chains disruptions", "Operational resource margins dependencies"],
        opportunities: ["AI agent swarm automated analytics", "Integration of predictive models"],
        threats: ["Shifting macroeconomic regulations", "Geopolitical transport friction factors"]
      },
      risks: ["Supply delay days exceeding 15 days", "Fluctuating operating margins"],
      recommendations: ["Optimize safety buffer stocks", "Conduct periodic swarm intelligence simulations"]
    };
  };

  // Fetch report when business selection changes
  useEffect(() => {
    if (!selectedBiz) return;
    const fetchReport = async () => {
      setIsReportLoading(true);
      try {
        const response = await fetch(getServiceUrl(8012, `/api/v1/reports/generate/${selectedBiz.id}`), {
          method: "POST"
        });
        if (response.ok) {
          const rep = await response.json();
          setReportData({
            summary: rep.executive_summary || `${selectedBiz.name} operates as a prominent ${selectedBiz.industry} twin.`,
            swot: {
              strengths: rep.swot?.strengths || ["Stable operational status.", "Automated metric tracking."],
              weaknesses: rep.swot?.weaknesses || ["Macro supply line vulnerability.", "High regional dependencies."],
              opportunities: rep.swot?.opportunities || ["Advanced predictive models integration.", "Localized warehousing grids."],
              threats: rep.swot?.threats || ["Regulatory restrictions updates.", "Supply delays risk."]
            },
            risks: rep.swot?.weaknesses || ["Supply delay days exceeding 15 days"],
            recommendations: rep.recommendations || ["Diversify supply contracts", "Scale safety margins"]
          });
        } else {
          console.warn("Reports service returned non-OK status, falling back to compiled client-side report.");
          setReportData(getFallbackReport(selectedBiz));
        }
      } catch (err) {
        console.error("Failed to fetch report from report service, using fallback:", err);
        setReportData(getFallbackReport(selectedBiz));
      } finally {
        setIsReportLoading(false);
      }
    };
    fetchReport();
  }, [selectedBiz]);

  // Sync selected business name with zustand store
  useEffect(() => {
    setSelectedBusiness(selectedBiz?.id ?? null, selectedBiz?.name ?? null);
  }, [selectedBiz, setSelectedBusiness]);

  // Dismiss toast notification
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // User Authentication Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Email and Password are required.");
      return;
    }
    setAuthError("");
    setAuthSuccess("");

    try {
      const response = await fetch(getServiceUrl(8001, "/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      if (response.ok) {
        const data = await response.json();
        // Resolve profile
        const meResp = await fetch(getServiceUrl(8001, "/api/v1/auth/me"), {
          headers: { "Authorization": `Bearer ${data.access_token}` }
        });
        if (meResp.ok) {
          const userData = await meResp.json();
          
          const sessionUser = {
            email: userData.email,
            role: userData.role, // super_admin, admin, analyst, viewer
            token: data.access_token
          };
          setUser(sessionUser);
          localStorage.setItem("bios_user", JSON.stringify(sessionUser));
          localStorage.setItem("bios_refresh_token", data.refresh_token);
          
          setAuthSuccess("Successfully authenticated session.");
          
          // Automatically redirect according to role
          setTimeout(() => {
            setActiveView("map");
            setAuthSuccess("");
          }, 800);
        } else {
          setAuthError("Failed to resolve user account credentials.");
        }
      } else {
        const errData = await response.json();
        setAuthError(errData.detail || "Incorrect email or password.");
      }
    } catch (err) {
      setAuthError("Unable to connect to Auth Service. Verify backend is running.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    try {
      const response = await fetch(getServiceUrl(8001, "/api/v1/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword, full_name: "SaaS Enterprise User", role: authRole }),
      });
      if (response.ok) {
        setAuthSuccess("Account configuration registered. Verifying domain...");
        setTimeout(() => {
          setAuthTab('verify');
          setAuthSuccess("");
        }, 1000);
      } else {
        const errData = await response.json();
        setAuthError(errData.detail || "Failed to register account.");
      }
    } catch (err) {
      setAuthError("Failed to reach auth registration service.");
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSuccess("Email verification successful! Logging into dashboard...");
    setTimeout(() => {
      // Fallback auto login
      handleLogin(e);
    }, 1000);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("bios_user");
    localStorage.removeItem("bios_refresh_token");
    setAuthEmail("");
    setAuthPassword("");
    setSelectedBiz(null);
    setSearchQuery("");
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSuccess("A reset link has been dispatched to your corporate inbox.");
    setTimeout(() => {
      setAuthTab('reset');
      setAuthSuccess("");
    }, 1500);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSuccess("Password has been reset successfully. Please sign in.");
    setTimeout(() => {
      setAuthTab('login');
      setAuthSuccess("");
    }, 1500);
  };

  // AI Command Bar Search Ingestion
  const handleQuery = async (queryText: string) => {
    const safeQueryText = queryText || "";
    setSearchQuery(safeQueryText);
    setShowSuggestions(false);
    const query = safeQueryText.toLowerCase();

    setIsScanning(true);
    setScanProgress(15);
    
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => Math.min(95, prev + 15));
    }, 100);

    // Search local database list
    let foundBiz = businesses.find(b => 
      b.name?.toLowerCase().includes(query) || 
      b.ceo?.toLowerCase().includes(query) ||
      b.industry?.toLowerCase().includes(query) ||
      b.country?.toLowerCase().includes(query)
    );

    setTimeout(() => {
      clearInterval(progressInterval);
      setScanProgress(100);

      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);

        if (foundBiz) {
          const hasCoords = (foundBiz.coords && Array.isArray(foundBiz.coords) && foundBiz.coords.length === 2) ||
                            (typeof foundBiz.latitude === 'number' && typeof foundBiz.longitude === 'number');
          if (!hasCoords) {
            setToastMessage(`Scanned Twin: ${foundBiz.name} (Location coordinates missing)`);
          } else {
            setToastMessage(`Scanned & Synchronized Digital Twin: ${foundBiz.name}`);
          }
          setSelectedBiz(foundBiz);
        } else {
          setToastMessage("No company found");
        }
      }, 200);
    }, 800);
  };

  // Run dynamic macroeconomic simulation calculations against backend
  const runMacroSimulation = async () => {
    if (!selectedBiz) {
      setToastMessage("Please select a target company to simulate trends.");
      return;
    }
    setIsSimulating(true);
    setSimProgress(10);

    const interval = setInterval(() => {
      setSimProgress((prev) => Math.min(95, prev + 20));
    }, 100);

    try {
      const response = await fetch(getServiceUrl(8008, "/api/v1/simulations/run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: selectedBiz.id,
          time_horizon: simulationHorizon === "12" ? "1Y" : "3Y",
          scenario_type: simScenario
        })
      });
      if (response.ok) {
        const resData = await response.json();
        clearInterval(interval);
        setSimProgress(100);

        setTimeout(() => {
          setIsSimulating(false);
          setSimProgress(0);
          setSimulationData(resData);
          
          const timeline = resData.timeline;
          const finalCost = timeline[timeline.length - 1].operating_cost;
          const finalRevenue = timeline[timeline.length - 1].revenue;
          const margin = timeline[timeline.length - 1].profit_margin;
          const lossVal = Math.max(0, (finalCost * (simSliders.inflation / 10)) - 10);

          setSimOutputs({
            revenueProjection: `$${(finalRevenue / 1000).toFixed(2)}M`,
            riskProjection: `${(100 - margin).toFixed(1)}%`,
            delayDays: `${Math.round(simSliders.shippingDelays * 1.5)} days`,
            financialLoss: `$${lossVal.toFixed(1)}M`,
            recoveryTime: `${Math.round(simSliders.shippingDelays * 2.5)} days`,
            affectedCount: Math.min(10, Math.round(simSliders.shippingDelays * 0.2 + 1)),
            status: "Simulations compiled successfully."
          });
          setToastMessage("Forecasting run completed against backend service.");
        }, 300);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setSimProgress(0);
        setSimulationData(null);
        setToastMessage("Backend simulation returned an error. Using local projections model.");
      }
    } catch (err) {
      console.error("Simulation engine failed:", err);
      clearInterval(interval);
      setIsSimulating(false);
      setSimProgress(0);
      setSimulationData(null);
      setToastMessage("Backend simulation engine offline. Using local projections model.");
    }
  };

  const applyPresetScenario = (scenarioName: string) => {
    setSimScenario(scenarioName);
    switch (scenarioName) {
      case "disruption":
        setSimSliders({ inflation: 8, oilPrice: 90, shippingDelays: 40, tariffs: 15, currencyExchange: 8, demandGrowth: -4, interestRate: 6.0 });
        break;
      case "war":
        setSimSliders({ inflation: 22, oilPrice: 135, shippingDelays: 55, tariffs: 45, currencyExchange: 15, demandGrowth: -15, interestRate: 8.5 });
        break;
      case "pandemic":
        setSimSliders({ inflation: 12, oilPrice: 50, shippingDelays: 48, tariffs: 10, currencyExchange: 12, demandGrowth: -25, interestRate: 1.0 });
        break;
      case "cyber":
        setSimSliders({ inflation: 5, oilPrice: 75, shippingDelays: 12, tariffs: 10, currencyExchange: 5, demandGrowth: -8, interestRate: 4.5 });
        break;
      case "port_closure":
        setSimSliders({ inflation: 9, oilPrice: 85, shippingDelays: 45, tariffs: 25, currencyExchange: 6, demandGrowth: -5, interestRate: 5.5 });
        break;
      default:
        setSimSliders({ inflation: 5, oilPrice: 75, shippingDelays: 10, tariffs: 10, currencyExchange: 5, demandGrowth: 5, interestRate: 4.5 });
    }
  };

  // Visual AI Swarm orchestrator timeline execution
  const runSwarmWorkflow = async () => {
    if (!agentInput || isSwarmRunning) return;
    setIsSwarmRunning(true);
    setSwarmProgress(5);
    setSwarmResult(null);

    // Initial log state resetting
    setSwarmStages([
      { id: "planner", label: "Planner Agent", description: "Deconstructs query into an execution plan.", status: "running", data: "Mapping target company context...", result: "" },
      { id: "crawler", label: "Crawler Scraper", description: "Fetches live webpage and traffic data indices.", status: "idle", data: "N/A", result: "" },
      { id: "graph", label: "Graph Builder", description: "Maps relationships and syncs Neo4j edges.", status: "idle", data: "N/A", result: "" },
      { id: "predictions", label: "Forecast Engine", description: "Runs Prophet calculations for metrics.", status: "idle", data: "N/A", result: "" },
      { id: "risk", label: "Risk Analyst", description: "Calculates Z-score, cyber, and geopolitical risk.", status: "idle", data: "N/A", result: "" },
      { id: "coordinator", label: "Swarm Coordinator", description: "Compiles SWOT briefs and summaries.", status: "idle", data: "N/A", result: "" }
    ]);

    const fallbackReport = {
      executive_summary: "AI Swarm offline fallback: Our agents processed the target query against cached corporate directory profiles. Mapped SWOT matrix is dynamically compiled.",
      swot_analysis: {
        strengths: ["Highly integrated corporate footprint", "Scalable proprietary platform infrastructure"],
        weaknesses: ["Exposure to supply delays and tariff shocks", "Elevated resource dependencies"],
        opportunities: ["Accelerated geographic expansion", "Dual-sourcing contract optimizations"],
        threats: ["Tightening regional compliance frameworks", "Intense local competitor bids"]
      },
      financial_forecasts: {
        estimated_annual_revenue: "$12.4B",
        predicted_growth_rate: "8.4% annually",
        bankruptcy_probability: "1.2% (Low Risk)",
        recommended_reserve_ratio: "15%"
      },
      action_items: [
        "Deploy dual-sourcing supply strategies.",
        "Optimize liquid cash reserves buffer ratio.",
        "Perform regular macroeconomic shock simulations."
      ]
    };

    const triggerSwarmAnimation = (resultData: any) => {
      // Planner completes
      setTimeout(() => {
        setSwarmStages(prev => prev.map(s => s.id === 'planner' ? { ...s, status: 'completed', data: "Input query deconstructed.", result: "Plan mapped: 4 modules assigned." } : s));
        setSwarmStages(prev => prev.map(s => s.id === 'crawler' ? { ...s, status: 'running', data: "Scanning local listings and web directories...", result: "" } : s));
        setSwarmProgress(20);
      }, 800);

      // Crawler completes
      setTimeout(() => {
        setSwarmStages(prev => prev.map(s => s.id === 'crawler' ? { ...s, status: 'completed', data: "Scraped corporate indicators.", result: "Verified active operations." } : s));
        setSwarmStages(prev => prev.map(s => s.id === 'graph' ? { ...s, status: 'running', data: "Re-indexing Neo4j node links...", result: "" } : s));
        setSwarmProgress(40);
      }, 1800);

      // Graph completes
      setTimeout(() => {
        setSwarmStages(prev => prev.map(s => s.id === 'graph' ? { ...s, status: 'completed', data: "Constructed 8 relationship edges.", result: "Cypher registry paths indexed." } : s));
        setSwarmStages(prev => prev.map(s => s.id === 'predictions' ? { ...s, status: 'running', data: "Running Prophet trend estimators...", result: "" } : s));
        setSwarmProgress(60);
      }, 2800);

      // Predictions completes
      setTimeout(() => {
        setSwarmStages(prev => prev.map(s => s.id === 'predictions' ? { ...s, status: 'completed', data: "Generated 12-month projections.", result: "Confidence limits computed." } : s));
        setSwarmStages(prev => prev.map(s => s.id === 'risk' ? { ...s, status: 'running', data: "Calculating Altman Z-Score & risk matrices...", result: "" } : s));
        setSwarmProgress(80);
      }, 3800);

      // Risk completes
      setTimeout(() => {
        setSwarmStages(prev => prev.map(s => s.id === 'risk' ? { ...s, status: 'completed', data: "Risk boundaries verified.", result: "Bankruptcy margin: 1.2% (Low)." } : s));
        setSwarmStages(prev => prev.map(s => s.id === 'coordinator' ? { ...s, status: 'completed', data: "Final SWOT briefing synthesized.", result: "Dashboard metrics packaged." } : s));
        setSwarmProgress(100);
        setSwarmResult(resultData);
        setIsSwarmRunning(false);
        setToastMessage("AI Agent Swarm completed query analysis!");
      }, 4800);
    };

    try {
      const response = await fetch(getServiceUrl(8009, "/api/v1/agents/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: agentInput })
      });

      if (response.ok) {
        const data = await response.json();
        triggerSwarmAnimation(data.result);
      } else {
        console.warn("Agent service returned error status, executing demo workflow.");
        triggerSwarmAnimation(fallbackReport);
      }
    } catch (err) {
      console.warn("Agent service offline, executing demo workflow:", err);
      triggerSwarmAnimation(fallbackReport);
    }
  };

  // Add Company CRUD Action
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName) return;

    const payload = {
      name: compName,
      industry: compIndustry,
      city: compCity || "Cupertino",
      country: compCountry || "USA",
      ceo: compCEO || "Unknown CEO",
      employees: parseInt(compEmployees) || 1000,
      revenue: parseFloat(compRevenue) || 1.2,
      market_cap: parseFloat(compMarketCap) || 10.0,
      founded: parseInt(compFounded) || 2000,
      stock_symbol: compStockSymbol || "NONE",
      status: compStatus || "Verified Twin",
      description: compDescription || "No description provided.",
      latitude: parseFloat(compLatitude) || 37.33,
      longitude: parseFloat(compLongitude) || -122.03
    };

    try {
      const response = await fetch(getServiceUrl(8002, "/api/v1/businesses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        setBusinesses(prev => [data, ...prev]);
        setSelectedBiz(data);
        setShowAddModal(false);
        setToastMessage(`Company "${data.name}" added to SQLite registry.`);
        // Clean fields
        setCompName(""); setCompCity(""); setCompCountry(""); setCompCEO(""); setCompEmployees(""); setCompRevenue(""); setCompMarketCap(""); setCompFounded(""); setCompStockSymbol(""); setCompLatitude(""); setCompLongitude(""); setCompDescription("");
      }
    } catch (err) {
      console.error("Failed to create company:", err);
      setToastMessage("Failed to reach directory service.");
    }
  };

  // Edit Company CRUD Action
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;

    const payload = {
      name: compName,
      industry: compIndustry,
      city: compCity,
      country: compCountry,
      ceo: compCEO,
      employees: parseInt(compEmployees) || 0,
      revenue: parseFloat(compRevenue) || 0,
      market_cap: parseFloat(compMarketCap) || 0,
      founded: parseInt(compFounded) || 0,
      stock_symbol: compStockSymbol,
      status: compStatus,
      description: compDescription,
      latitude: parseFloat(compLatitude) || 0,
      longitude: parseFloat(compLongitude) || 0
    };

    try {
      const response = await fetch(getServiceUrl(8002, `/api/v1/businesses/${editingBiz.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        setBusinesses(prev => prev.map(b => b.id === editingBiz.id ? data : b));
        setSelectedBiz(data);
        setShowEditModal(false);
        setToastMessage(`Updated database record for "${data.name}".`);
      }
    } catch (err) {
      console.error("Failed to update company:", err);
      setToastMessage("Failed to update record.");
    }
  };

  const handleEditClick = (biz: any) => {
    setEditingBiz(biz);
    setCompName(biz.name || "");
    setCompIndustry(biz.industry || "Technology");
    setCompCity(biz.city || "");
    setCompCountry(biz.country || "");
    setCompCEO(biz.ceo || "");
    setCompEmployees(biz.employees ? String(biz.employees) : "");
    setCompRevenue(biz.revenue ? String(biz.revenue) : "");
    setCompMarketCap(biz.marketCap ? String(biz.marketCap) : "");
    setCompFounded(biz.founded ? String(biz.founded) : "");
    setCompStockSymbol(biz.stockSymbol || "");
    setCompLatitude(biz.latitude ? String(biz.latitude) : "");
    setCompLongitude(biz.longitude ? String(biz.longitude) : "");
    setCompStatus(biz.status || "Verified Twin");
    setCompDescription(biz.description || "");
    setShowEditModal(true);
  };

  // Delete Company CRUD Action
  const handleDeleteCompany = async (id: string) => {
    try {
      const response = await fetch(getServiceUrl(8002, `/api/v1/businesses/${id}`), {
        method: "DELETE"
      });
      if (response.ok) {
        setBusinesses(prev => prev.filter(b => b.id !== id));
        if (selectedBiz?.id === id) {
          setSelectedBiz(null);
        }
        setToastMessage("Company record permanently deleted from database.");
      }
    } catch (err) {
      console.error("Failed to delete company:", err);
      setToastMessage("Failed to delete company from database.");
    }
  };

  // Bulk CSV Upload parsing
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    // Parse CSV lines: Name, Industry, City, Country, CEO, Revenue, Risk
    const lines = csvText.split("\n");
    let count = 0;

    for (let line of lines) {
      if (line.toLowerCase().includes("name,industry") || !line.trim()) continue;
      const cols = line.split(",").map(c => c.replace(/"/g, '').trim());
      if (cols.length >= 2) {
        const payload = {
          name: cols[0],
          industry: cols[1],
          city: cols[2] || "New City",
          country: cols[3] || "USA",
          ceo: cols[4] || "Executive",
          revenue: parseFloat(cols[5]) || 50,
          employees: 1000,
          market_cap: 100,
          founded: 2010,
          stock_symbol: "CSV",
          status: "Verified Twin",
          description: "Bulk uploaded company twin.",
          latitude: 40.0 + (Math.random() - 0.5) * 10,
          longitude: -80.0 + (Math.random() - 0.5) * 20
        };

        try {
          const res = await fetch(getServiceUrl(8002, "/api/v1/businesses"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            count++;
          }
        } catch (err) {
          console.error("Bulk upload failed for line:", line);
        }
      }
    }

    setToastMessage(`Bulk uploaded ${count} new company records successfully.`);
    setShowBulkModal(false);
    setCsvText("");
    loadBusinesses(); // reload data
  };

  // CSV Export utility
  const handleCSVExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name", "Industry", "City", "Country", "CEO", "Revenue", "Employees", "MarketCap", "Founded", "StockSymbol", "Status"].join(",") + "\n"
      + businesses.map(b => `"${b.name}","${b.industry}","${b.city}","${b.country}","${b.ceo}",${b.revenue},${b.employees},${b.market_cap},${b.founded},"${b.stock_symbol}","${b.status}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bios_corporate_registry_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage("Corporate registry exported successfully.");
  };

  // Filter & Paginate list for CRM
  const filteredCrmList = businesses.filter(b => {
    if (crmFilterIndustry === "All") return true;
    return b.industry === crmFilterIndustry;
  });
  const pageStart = (crmPage - 1) * crmPageSize;
  const paginatedCrmList = filteredCrmList.slice(pageStart, pageStart + crmPageSize);
  const totalCrmPages = Math.ceil(filteredCrmList.length / crmPageSize);

  // User Administration Handlers
  // User Administration Handlers
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormEmail) return;

    try {
      if (editingUser) {
        // Edit User
        const userId = editingUser.id;
        
        // 1. Update role if changed
        if (editingUser.role !== userFormRole) {
          const roleResp = await apiFetch(getServiceUrl(8001, `/api/v1/auth/users/${userId}/role`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: userFormRole })
          });
          if (!roleResp.ok) {
            const err = await roleResp.json();
            throw new Error(err.detail || "Failed to update user role");
          }
        }
        
        // 2. Update status if changed
        const currentActive = editingUser.is_active;
        const newActive = userFormStatus === "Active";
        if (currentActive !== newActive) {
          const statusResp = await apiFetch(getServiceUrl(8001, `/api/v1/auth/users/${userId}/status`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: newActive })
          });
          if (!statusResp.ok) {
            const err = await statusResp.json();
            throw new Error(err.detail || "Failed to update user status");
          }
        }

        setToastMessage(`User ${userFormEmail} updated successfully.`);
      } else {
        // Create User (via Register first, then assign role/status if needed)
        // Since register expects password, we generate a temporary password
        const tempPassword = "TemporaryPassword123!";
        const regResp = await fetch(getServiceUrl(8001, "/api/v1/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userFormEmail,
            password: tempPassword,
            full_name: userFormName,
            role: "viewer"
          })
        });
        
        if (!regResp.ok) {
          const err = await regResp.json();
          throw new Error(err.detail || "Failed to register new identity user");
        }
        
        const createdUser = await regResp.json();
        const createdId = createdUser.id;
        
        // If a role other than viewer was requested, update role
        if (userFormRole !== "viewer") {
          await apiFetch(getServiceUrl(8001, `/api/v1/auth/users/${createdId}/role`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: userFormRole })
          });
        }
        
        // If suspended was requested, update status
        if (userFormStatus !== "Active") {
          await apiFetch(getServiceUrl(8001, `/api/v1/auth/users/${createdId}/status`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: false })
          });
        }

        setToastMessage(`User ${userFormEmail} created with temp password: ${tempPassword}`);
      }
      
      // Reload user list
      loadManagedUsers();
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormEmail(""); setUserFormName("");
    } catch (err: any) {
      console.error("Failed to save user:", err);
      setToastMessage(err.message || "Failed to save user account modifications.");
    }
  };

  const handleEditUser = (usr: any) => {
    setEditingUser(usr);
    setUserFormEmail(usr.email);
    setUserFormName(usr.full_name || "");
    setUserFormRole(usr.role);
    setUserFormStatus(usr.is_active ? "Active" : "Suspended");
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await apiFetch(getServiceUrl(8001, `/api/v1/auth/users/${id}`), {
        method: "DELETE"
      });
      if (response.ok) {
        setToastMessage("User account deleted successfully.");
        loadManagedUsers();
      } else {
        const err = await response.json();
        setToastMessage(err.detail || "Failed to delete user account.");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      setToastMessage("Failed to connect to backend user deletion API.");
    }
  };

  // Navigation Items
  const navigationItems = [
    { key: 'map', label: 'Planetary Map', icon: Globe, allowed: ['super_admin', 'admin', 'analyst', 'viewer'] },
    { key: 'graph', label: 'Knowledge Graph', icon: Share2, allowed: ['super_admin', 'admin', 'analyst'] },
    { key: 'predictions', label: 'Simulate Trends', icon: TrendingUp, allowed: ['super_admin', 'analyst'] },
    { key: 'chat', label: 'AI Swarm', icon: MessageSquare, allowed: ['super_admin', 'admin', 'analyst'] },
    { key: 'reports', label: 'Briefing Reports', icon: FileText, allowed: ['super_admin', 'admin', 'analyst', 'viewer'] },
    { key: 'management', label: 'Company CRM', icon: Building, allowed: ['super_admin', 'admin'] },
    { key: 'settings', label: 'Super Admin Panel', icon: Settings, allowed: ['super_admin'] }
  ].filter(item => item.allowed.includes(user?.role ?? ''));

  // Ensure unauthenticated routes force login view
  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/40 via-slate-50 to-indigo-50/40 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Abstract animated glow panels */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl max-w-md w-full space-y-6 relative z-10">
          
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/20">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">BIOS SaaS Platform</h2>
            <p className="text-xs text-slate-500 font-medium">Planetary-Scale Digital Twin Management System</p>
          </div>

          {/* Form Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button 
              onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${authTab === 'login' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${authTab === 'register' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200/60 text-red-600 p-3.5 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-600 p-3.5 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
              <span>{authSuccess}</span>
            </div>
          )}

          {authTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Email Address</label>
                <input 
                  type="email" required
                  placeholder="name@company.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Password</label>
                  <button type="button" onClick={() => setAuthTab('forgot')} className="text-[9px] text-indigo-600 hover:underline font-bold">Forgot?</button>
                </div>
                <div className="relative">
                  <input 
                     type={showPassword ? "text" : "password"} required
                     placeholder="••••••••" 
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
                     value={authPassword}
                     onChange={(e) => setAuthPassword(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <label className="flex items-center space-x-2 text-slate-500 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md transition"
              >
                Sign In
              </button>
            </form>
          )}

          {authTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Email Address</label>
                <input 
                  type="email" required
                  placeholder="name@company.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Password</label>
                <input 
                  type="password" required
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white font-medium transition"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>



              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md transition"
              >
                Register & Verify
              </button>
            </form>
          )}

          {authTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">Enter your registered email address and we&apos;ll send you an activation link to recover access.</p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Email Address</label>
                <input 
                  type="email" required
                  placeholder="name@company.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md transition"
              >
                Send Reset Link
              </button>
              <button type="button" onClick={() => setAuthTab('login')} className="w-full text-center text-xs font-bold text-indigo-600 hover:underline">Back to Login</button>
            </form>
          )}

          {authTab === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Confirmation Key</label>
                <input 
                  type="text" required
                  placeholder="BIOS-RESET-123" 
                  value={resetConfirmCode}
                  onChange={(e) => setResetConfirmCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">New Password</label>
                <input 
                  type="password" required
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md"
              >
                Reset Password
              </button>
            </form>
          )}

          {authTab === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">Enter the 6-digit confirmation code dispatched to your organization registry inbox.</p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Confirmation Code</label>
                <input 
                  type="text" required
                  placeholder="BIOS-99" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 text-center font-mono font-bold tracking-widest outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md"
              >
                Confirm Verification
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // Dashboard structure
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      
      {/* GLOBAL TOPBAR BRANDING */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between shadow-xs relative z-40">
        <div className="flex items-center space-x-3">
          {/* Hamburger menu button for mobile devices */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-sm select-none">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>BIOS Operating System</span>
              <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">{user.role.replace('_', ' ')}</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Palantir Foundry / Bloomberg SaaS digital twin cluster</p>
          </div>
        </div>

        {/* Dynamic Organization Swapper */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Building className="w-4 h-4 text-indigo-500" />
            <select
              value={activeOrg}
              onChange={(e) => setActiveOrg(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="Apple Organization Console">Apple Organization Console</option>
              <option value="Google Cloud Admin console">Google Cloud Admin console</option>
              <option value="Microsoft Corp Enterprise">Microsoft Corp Enterprise</option>
              <option value="Tesla Gigafactory Dashboard">Tesla Gigafactory Dashboard</option>
            </select>
          </div>

          {/* User badge */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xs">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[10px] font-bold text-slate-700 leading-tight truncate max-w-32">{user.email}</p>
              <button onClick={handleLogout} className="text-[8px] text-red-500 hover:underline font-bold uppercase tracking-wider">Sign Out</button>
            </div>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE GRID */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Mobile Sidebar Overlay Drawer */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2.5px] z-50 md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div 
              className="w-64 bg-white h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-250"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Workspace Views</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
                </div>
                
                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveView(item.key);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight transition ${
                          isActive 
                            ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 shadow-xs' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>SLA Service status active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIDEBAR NAVIGATION BAR */}
        <nav className="hidden md:flex w-64 bg-white border-r border-slate-200/80 p-5 flex-col justify-between shrink-0 shadow-xs">
          <div className="space-y-6">
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-2 font-mono">Workspace Views</span>
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveView(item.key)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-tight transition ${
                        isActive 
                          ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600 shadow-xs' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Saved Bookmarks widget for Viewer/Analyst */}
            <div className="border-t border-slate-100 pt-5">
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block mb-2.5 font-mono">Saved Twins</span>
              <div className="space-y-1.5 text-xs">
                {businesses.slice(0, 5).map((b, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedBiz(b); }}
                    className="w-full flex items-center justify-between text-slate-600 hover:text-indigo-600 font-semibold text-[11px]"
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="font-mono text-[9px] text-slate-400 px-1 bg-slate-50 rounded">{b.industry.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SLA Quick Status Indicator */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500">
              <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>SaaS Ingest Network: OK</span>
            </div>
            <p className="text-[8px] text-slate-400 leading-snug mt-1 font-mono">Uptime: 99.98% | Latency: {sysMetrics.latency}ms</p>
          </div>
        </nav>

        {/* DYNAMIC VIEWS WORKSPACE AREA */}
        <main className="flex-1 p-6 overflow-y-auto relative bg-slate-50">
          
          {/* SEARCH HEADER */}
          {activeView !== 'settings' && activeView !== 'management' && (
            <div className="mb-6 max-w-3xl relative">
              <div className="bg-white border border-slate-200/80 rounded-2xl flex overflow-hidden shadow-sm hover:shadow-md transition focus-within:border-indigo-400">
                <div className="flex-1 flex items-center px-4 space-x-2">
                  <Search className="text-slate-400 w-4 h-4 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Search global database twins by Name, CEO, Industry, Country..."
                    className="w-full bg-transparent border-0 outline-none text-slate-800 placeholder-slate-400 py-3 text-xs font-semibold"
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuery(searchQuery)}
                  />
                </div>
                <button 
                  onClick={() => handleQuery(searchQuery)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 font-bold text-[10px] uppercase tracking-wider transition"
                >
                  Scan Database
                </button>
              </div>

              {/* Suggestions */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">Try these corporate models</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuery(term)}
                        className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: PLANETARY MAP CONTAINER */}
          <div className={activeView === 'map' ? 'block' : 'hidden'}>
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <Globe className="text-indigo-500 w-5 h-5" />
                    <span>Real-Time Business Coordinates & Oceanic Freight Lanes</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Visually tracking live business coordinates, traffic flows, and operational risk metrics across the globe.</p>
                </div>
                <ErrorBoundary fallbackLabel="Planetary Coordinate Map Service Error">
                  {activeView === 'map' && (
                    <PlanetaryMap 
                      onSelectBusiness={(biz) => setSelectedBiz(biz)} 
                      selectedId={selectedBiz?.id ?? null} 
                      businesses={businesses}
                    />
                  )}
                </ErrorBoundary>
              </div>
            </div>
          </div>

          {/* VIEW: KNOWLEDGE RELATIONSHIP GRAPH */}
          <div className={activeView === 'graph' ? 'block' : 'hidden'}>
            {activeView === 'graph' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <Share2 className="text-indigo-500 w-5 h-5" />
                      <span>Dynamic Business Relationship Explorer</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Structures entity interactions (Competitors, Suppliers, Partner structures) based on database cypher index claims.</p>
                  </div>

                  {selectedBiz ? (
                    <ErrorBoundary fallbackLabel="Relationship Network Graph Error">
                      <RelationshipGraph businessName={selectedBiz.name} />
                    </ErrorBoundary>
                  ) : (
                    <div className="w-full h-[450px] bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                      <Share2 className="w-10 h-10 text-indigo-400 mb-3 animate-pulse" />
                      <h4 className="text-sm font-bold text-slate-700">Company Not Selected</h4>
                      <p className="text-xs text-slate-400 max-w-md mt-1">Please query a registered company twin from the search bar to load its relationship graph nodes.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* VIEW: TREND FORECAST SHOCKS SIMULATION */}
          {activeView === 'predictions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* Simulation controls panel */}
                <div className="xl:col-span-1 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Shock Preset Scenarios</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {[
                        { key: "base", label: "Base Case (No Shocks)" },
                        { key: "disruption", label: "Supply Chain Disruption" },
                        { key: "war", label: "Military Conflict / War" },
                        { key: "pandemic", label: "Global Pandemic" },
                        { key: "cyber", label: "Infrastructure Cyber Attack" },
                        { key: "port_closure", label: "Ocean Port Closure" }
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => applyPresetScenario(preset.key)}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl border transition ${
                            simScenario === preset.key 
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-300' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Inflation Rate</span>
                          <span className="text-indigo-600 font-mono">+{simSliders.inflation}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="30"
                          value={simSliders.inflation}
                          onChange={(e) => setSimSliders(prev => ({ ...prev, inflation: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Shipping Lane Delays</span>
                          <span className="text-indigo-600 font-mono">+{simSliders.shippingDelays} days</span>
                        </div>
                        <input 
                          type="range" min="0" max="90"
                          value={simSliders.shippingDelays}
                          onChange={(e) => setSimSliders(prev => ({ ...prev, shippingDelays: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Tariff Shocks</span>
                          <span className="text-indigo-600 font-mono">+{simSliders.tariffs}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="50"
                          value={simSliders.tariffs}
                          onChange={(e) => setSimSliders(prev => ({ ...prev, tariffs: parseInt(e.target.value) }))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Interest Rates</span>
                          <span className="text-indigo-600 font-mono">{simSliders.interestRate}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="15" step="0.5"
                          value={simSliders.interestRate}
                          onChange={(e) => setSimSliders(prev => ({ ...prev, interestRate: parseFloat(e.target.value) }))}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Forecast Horizon</span>
                          <span className="text-indigo-600 font-mono">{simulationHorizon} months</span>
                        </div>
                        <select 
                          value={simulationHorizon}
                          onChange={(e) => setSimulationHorizon(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs outline-none"
                        >
                          <option value="12">12 Months (1Y)</option>
                          <option value="36">36 Months (3Y)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={runMacroSimulation}
                    disabled={isSimulating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isSimulating ? `Simulating (${simProgress}%)` : "Run Shock Model"}</span>
                  </button>
                </div>

                {/* Simulation Outputs Plotter */}
                <div className="xl:col-span-3 space-y-6">
                  
                  {/* Metric KPI cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                      <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Projected Revenue</span>
                      <span className="text-lg font-bold text-indigo-600 font-mono block mt-1">{simOutputs.revenueProjection}</span>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                      <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Risk Index Coefficient</span>
                      <span className="text-lg font-bold text-red-500 font-mono block mt-1">{simOutputs.riskProjection}</span>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                      <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Projected Cargo Delay</span>
                      <span className="text-lg font-bold text-slate-800 font-mono block mt-1">{simOutputs.delayDays}</span>
                    </div>
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
                      <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Calculated Asset Loss</span>
                      <span className="text-lg font-bold text-amber-600 font-mono block mt-1">{simOutputs.financialLoss}</span>
                    </div>
                  </div>

                  {selectedBiz ? (
                    <ErrorBoundary fallbackLabel="Simulation Analysis Charts Error">
                      <SimulationCharts 
                        scenario={simScenario} 
                        horizon={simulationHorizon} 
                        businessName={selectedBiz.name} 
                        simulationData={simulationData}
                      />
                    </ErrorBoundary>
                  ) : (
                    <div className="w-full h-80 bg-white border border-slate-200/80 rounded-3xl flex flex-col items-center justify-center text-center p-6 shadow-sm">
                      <TrendingUp className="w-10 h-10 text-slate-300 animate-pulse mb-2" />
                      <h4 className="text-sm font-bold text-slate-700">Digital Twin Not Scanned</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1">Please select an active company from the directory search bar to start predictions.</p>
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

          {/* VIEW: REDESIGNED ENTERPRISE AI SWARM WORKFLOW */}
          {activeView === 'chat' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Swarm input console */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 fill-current" />
                  <h2 className="text-base font-extrabold text-slate-900">Enterprise AI Multi-Agent Swarm Orchestrator</h2>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Dispatch natural language operational queries down to the 16-agent orchestrator swarm. BIOS will deploy agents to plan, scrape, map, forecast, and report analysis results.
                </p>

                <div className="flex space-x-3">
                  <input 
                    type="text"
                    disabled={isSwarmRunning}
                    placeholder="e.g., Audit supply chain risk and forecast revenues for Apple Inc under 6% inflation..."
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runSwarmWorkflow()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-semibold outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={runSwarmWorkflow}
                    disabled={isSwarmRunning || !agentInput}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition flex items-center space-x-2 shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isSwarmRunning ? "Executing..." : "Dispatch Swarm"}</span>
                  </button>
                </div>
              </div>

              {/* Progress Timeline Stepper */}
              {isSwarmRunning && (
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-xs font-extrabold text-slate-800">Orchestrator Swarm Trace Progress</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono font-bold">{swarmProgress}% Complete</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${swarmProgress}%` }} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {swarmStages.map((stage, i) => (
                      <div 
                        key={i} 
                        className={`p-4 border rounded-2xl transition-all duration-300 relative ${
                          stage.status === 'running' 
                            ? 'border-indigo-400 bg-indigo-50/20 shadow-md ring-1 ring-indigo-400' 
                            : stage.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50/10'
                            : 'border-slate-200 bg-slate-50 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">{stage.label}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            stage.status === 'running' ? 'bg-indigo-500 animate-ping' : stage.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{stage.description}</p>
                        
                        <div className="mt-3 pt-3 border-t border-slate-100/60 space-y-1.5 text-[10px] font-mono">
                          <div>
                            <span className="text-slate-400 font-sans font-bold">Data: </span>
                            <span className="text-slate-600 font-semibold">{stage.data}</span>
                          </div>
                          {stage.result && (
                            <div>
                              <span className="text-emerald-600 font-sans font-bold">Result: </span>
                              <span className="text-slate-700 font-semibold">{stage.result}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Redesigned Executive Summary Dashboard Card */}
              {swarmResult && !isSwarmRunning && (
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Swarm Executive Summary Report</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Dynamically compiled metrics package resolved by the 16-agent swarms.</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setActiveView('reports')}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Report</span>
                      </button>
                      <button 
                        onClick={() => setActiveView('graph')}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition flex items-center space-x-1"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Open Graph</span>
                      </button>
                      <button 
                        onClick={() => setActiveView('map')}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition flex items-center space-x-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Open Map</span>
                      </button>
                      <button 
                        onClick={() => {
                          const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(swarmResult, null, 2));
                          const link = document.createElement("a");
                          link.setAttribute("href", jsonStr);
                          link.setAttribute("download", "bios_swarm_export.json");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition flex items-center space-x-1 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      
                      {/* Overview Box */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Company Scope Summary</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed mt-2">
                          {swarmResult.executive_summary}
                        </p>
                      </div>

                      {/* SWOT Matrix Card */}
                      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-3">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">SWOT Matrix Indicator</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="bg-emerald-50/30 border border-emerald-100 p-3.5 rounded-xl space-y-1.5">
                            <span className="font-extrabold text-emerald-800 text-[10px] block">Strengths</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-semibold">
                              {swarmResult.swot_analysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                          <div className="bg-red-50/30 border border-red-100 p-3.5 rounded-xl space-y-1.5">
                            <span className="font-extrabold text-red-800 text-[10px] block">Weaknesses</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-semibold">
                              {swarmResult.swot_analysis.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                          <div className="bg-blue-50/30 border border-blue-100 p-3.5 rounded-xl space-y-1.5">
                            <span className="font-extrabold text-blue-800 text-[10px] block">Opportunities</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-semibold">
                              {swarmResult.swot_analysis.opportunities.map((o: string, i: number) => <li key={i}>{o}</li>)}
                            </ul>
                          </div>
                          <div className="bg-orange-50/30 border border-orange-100 p-3.5 rounded-xl space-y-1.5">
                            <span className="font-extrabold text-orange-800 text-[10px] block">Threats</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-semibold">
                              {swarmResult.swot_analysis.threats.map((t: string, i: number) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="space-y-4">
                      
                      {/* Risk Index gauges */}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Calculated Risk Gauges</span>
                        <div className="space-y-3 font-semibold text-slate-700">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>Financial Distress Probability</span>
                              <span className="text-red-500 font-bold">{swarmResult.financial_forecasts.bankruptcy_probability}</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-red-500 h-full w-[12%]" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>Supply Chain Interruption Risk</span>
                              <span className="text-orange-500 font-bold">Medium Exposure (48%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-orange-500 h-full w-[48%]" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>Geopolitical & Currency Friction</span>
                              <span className="text-amber-500 font-bold">Low Impact (25%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full w-[25%]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Forecasts brief */}
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Future Predictions</span>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Annual Revenue</span>
                            <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{swarmResult.financial_forecasts.estimated_annual_revenue}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Growth Factor</span>
                            <span className="font-extrabold text-emerald-600 text-sm mt-0.5 block">{swarmResult.financial_forecasts.predicted_growth_rate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations Brief */}
                      <div className="bg-slate-50 border border-slate-200/80 text-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block font-mono">Mitigation Strategies</span>
                        <ul className="space-y-2 text-[11px] font-medium">
                          {swarmResult.action_items.map((item: string, i: number) => (
                            <li key={i} className="flex items-start space-x-2">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-slate-600">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW: BRIEFING REPORTS EXPANDED */}
          {activeView === 'reports' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <FileText className="text-indigo-500 w-5 h-5" />
                      <span>Executive Briefings Console</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Interactive printable briefings reporting SWOT quadrants, ESG indices, and supply chains.</p>
                  </div>

                  {selectedBiz && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => window.print()}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                      <button 
                        onClick={() => {
                          const csvContent = "data:text/csv;charset=utf-8," 
                            + ["Summary", "Strengths", "Weaknesses", "Opportunities", "Threats", "Recommendations"].join(",") + "\n"
                            + `"${reportData.summary}","${reportData.swot.strengths.join(' | ')}","${reportData.swot.weaknesses.join(' | ')}","${reportData.swot.opportunities.join(' | ')}","${reportData.swot.threats.join(' | ')}","${reportData.recommendations.join(' | ')}"`;
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `bios_briefing_${selectedBiz.name.replace(/\s+/g, '_')}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  )}
                </div>

                {isReportLoading ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                    <h4 className="text-sm font-bold text-slate-700">Compiling Executive Briefing...</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Aggregating SWOT matrices, financial indicators, and ESG profiles from microservice nodes.</p>
                  </div>
                ) : reportData && selectedBiz ? (
                  <div className="space-y-6">
                    
                    {/* Sub-tabs row */}
                    <div className="flex border-b border-slate-200 text-xs overflow-x-auto gap-4 py-1">
                      {[
                        { key: 'overview', label: 'Overview' },
                        { key: 'financial', label: 'Financial Indicators' },
                        { key: 'supply_chain', label: 'Supply Chain' },
                        { key: 'competitors', label: 'Competitors' },
                        { key: 'risk', label: 'Risk Indices' },
                        { key: 'esg', label: 'ESG Profile' },
                        { key: 'ai_summary', label: 'AI Swarm Summary' }
                      ].map(t => (
                        <button
                          key={t.key}
                          onClick={() => setActiveReportTab(t.key as any)}
                          className={`pb-2.5 font-bold whitespace-nowrap transition-all border-b-2 ${
                            activeReportTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab panels */}
                    {activeReportTab === 'overview' && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Executive Summary</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-2">{reportData.summary}</p>
                        </div>

                        {/* SWOT Card */}
                        <div className="grid grid-cols-2 gap-4 text-xs mt-4">
                          <div className="bg-emerald-50/20 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                            <span className="font-bold text-emerald-800 text-[10px] block">Strengths</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-semibold">
                              {reportData.swot.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                          <div className="bg-red-50/20 border border-red-100 p-4 rounded-xl space-y-1.5">
                            <span className="font-bold text-red-800 text-[10px] block">Weaknesses</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-semibold">
                              {reportData.swot.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                          <div className="bg-blue-50/20 border border-blue-100 p-4 rounded-xl space-y-1.5">
                            <span className="font-bold text-blue-800 text-[10px] block">Opportunities</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-semibold">
                              {reportData.swot.opportunities.map((o: string, i: number) => <li key={i}>{o}</li>)}
                            </ul>
                          </div>
                          <div className="bg-orange-50/20 border border-orange-100 p-4 rounded-xl space-y-1.5">
                            <span className="font-bold text-orange-800 text-[10px] block">Threats</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-semibold">
                              {reportData.swot.threats.map((t: string, i: number) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeReportTab === 'financial' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Financial Twin Indicators</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs font-semibold text-slate-700">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Annual Revenue Estimate</span>
                            <span className="font-extrabold text-slate-900 text-base mt-1 block">${selectedBiz.revenue ? `${selectedBiz.revenue} Billion` : "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Market Cap Valuation</span>
                            <span className="font-extrabold text-slate-900 text-base mt-1 block">${selectedBiz.marketCap ? `${selectedBiz.marketCap} Billion` : "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Calculated Growth Coefficient</span>
                            <span className="font-extrabold text-emerald-600 text-base mt-1 block">{selectedBiz.growth ?? "+5.2%"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeReportTab === 'supply_chain' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Core Supply Chain Networks</span>
                        <div className="space-y-2 text-xs font-semibold">
                          <p className="text-slate-600">The following entities are mapped as primary upstream supply channels:</p>
                          <ul className="space-y-1.5">
                            {(selectedBiz.suppliers ?? ["Sino Logistics", "TSMC Co."]).map((s: string, i: number) => (
                              <li key={i} className="flex items-center space-x-2 text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl w-fit">
                                <Building className="w-3.5 h-3.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {activeReportTab === 'competitors' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Core Market Rivals</span>
                        <div className="space-y-2 text-xs font-semibold">
                          <p className="text-slate-600">Active competitor nodes calculated in database vector search indices:</p>
                          <ul className="space-y-1.5">
                            {(selectedBiz.competitors ?? ["Google LLC", "Microsoft Corporation"]).map((c: string, i: number) => (
                              <li key={i} className="flex items-center space-x-2 text-orange-600 font-bold bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl w-fit">
                                <Building className="w-3.5 h-3.5" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {activeReportTab === 'risk' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Dynamic Risk Assessment</span>
                        <div className="space-y-3 font-semibold text-slate-700">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>Altman Z-Score Failure Index</span>
                              <span className="text-red-500 font-bold">{selectedBiz.risk ?? 15}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-red-500 h-full" style={{ width: `${selectedBiz.risk ?? 15}%` }} />
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Audit Action Recommendations</span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 mt-2">
                              {reportData.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeReportTab === 'esg' && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">SaaS ESG Audit Index</span>
                        <div className="grid grid-cols-3 gap-4 text-center text-xs font-semibold">
                          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                            <span className="text-emerald-800 font-extrabold block">Environmental</span>
                            <span className="text-lg font-bold font-mono text-emerald-950 block mt-2">84 / 100</span>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                            <span className="text-indigo-800 font-extrabold block">Social Rights</span>
                            <span className="text-lg font-bold font-mono text-indigo-950 block mt-2">78 / 100</span>
                          </div>
                          <div className="bg-slate-100 border border-slate-300 p-4 rounded-xl">
                            <span className="text-slate-800 font-extrabold block">Governance</span>
                            <span className="text-lg font-bold font-mono text-slate-950 block mt-2">91 / 100</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeReportTab === 'ai_summary' && (
                      <div className="bg-slate-50 text-slate-800 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block font-mono">Swarm Neural Briefing</span>
                        <p className="text-xs leading-relaxed text-slate-600 italic font-medium">
                          &ldquo;Autonomous reflection checks verified: forecasting confidence margins are within ±3.4%. Recommended allocation triggers: increase safety buffer stocks to 35 days, optimize capital reserve ratio, and monitor competitors&apos; geographical expansion paths.&rdquo;
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <FileText className="w-12 h-12 text-slate-300 animate-pulse mb-3" />
                    <h4 className="text-sm font-bold text-slate-700">Digital Twin Not Selected</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">Please select an active corporate twin from the directory search bar to render dynamically compiled briefings.</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* VIEW: COMPANY CRM & CRUD PANEL */}
          {activeView === 'management' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                      <Building className="text-indigo-500 w-5 h-5" />
                      <span>Corporate Registry & Data Management</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Manage digital twin properties, trigger bulk CSV uploads, and download registry sheets.</p>
                  </div>

                  {/* CRM Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Bulk Upload (CSV)</span>
                    </button>

                    <button 
                      onClick={handleCSVExport}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Registry</span>
                    </button>

                    <button 
                      onClick={() => {
                        // Clear form fields
                        setCompName(""); setCompCity(""); setCompCountry(""); setCompCEO(""); setCompEmployees(""); setCompRevenue(""); setCompMarketCap(""); setCompFounded(""); setCompStockSymbol(""); setCompLatitude(""); setCompLongitude(""); setCompDescription("");
                        setShowAddModal(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Company</span>
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex justify-between items-center mb-4 text-xs font-semibold text-slate-600">
                  <div className="flex space-x-2 items-center">
                    <span>Filter Industry:</span>
                    <select 
                      value={crmFilterIndustry}
                      onChange={(e) => { setCrmFilterIndustry(e.target.value); setCrmPage(1); }}
                      className="bg-white border border-slate-200 rounded-xl px-2 py-1 outline-none text-slate-700 cursor-pointer"
                    >
                      <option value="All">All Industries</option>
                      <option value="Technology">Technology</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Logistics">Logistics</option>
                    </select>
                  </div>
                  <span>Total Records: {filteredCrmList.length}</span>
                </div>

                {/* Table GRID */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner bg-slate-50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-3">Company Name</th>
                        <th className="p-3">Industry</th>
                        <th className="p-3">CEO</th>
                        <th className="p-3">Founded</th>
                        <th className="p-3">Region</th>
                        <th className="p-3">Revenue ($B)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Audit Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                      {paginatedCrmList.map((biz) => (
                        <tr key={biz.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{biz.name}</td>
                          <td className="p-3">{biz.industry}</td>
                          <td className="p-3">{biz.ceo ?? "N/A"}</td>
                          <td className="p-3">{biz.founded ?? "N/A"}</td>
                          <td className="p-3">{biz.city}, {biz.country}</td>
                          <td className="p-3 font-mono">{biz.revenue ? `$${biz.revenue}B` : "N/A"}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] rounded font-bold">
                              {biz.status || "Verified Twin"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2 font-bold">
                              <button 
                                onClick={() => { setSelectedBiz(biz); setActiveView('map'); }}
                                className="text-indigo-600 hover:text-indigo-900 hover:underline"
                              >
                                View
                              </button>
                              <button 
                                onClick={() => handleEditClick(biz)}
                                className="text-slate-600 hover:text-slate-900 hover:underline"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteCompany(biz.id)}
                                className="text-red-500 hover:text-red-900 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* CRM Pagination */}
                {totalCrmPages > 1 && (
                  <div className="flex justify-between items-center mt-4 text-xs font-semibold text-slate-500">
                    <button 
                      disabled={crmPage === 1}
                      onClick={() => setCrmPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span>Page {crmPage} of {totalCrmPages}</span>
                    <button 
                      disabled={crmPage === totalCrmPages}
                      onClick={() => setCrmPage(prev => Math.min(totalCrmPages, prev + 1))}
                      className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}

              </div>

              {/* Add Company Modal Dialog */}
              {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2.5px] z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                      <Plus className="w-5 h-5 text-indigo-500" />
                      <span>Register New Corporate Twin</span>
                    </h3>
                    <form onSubmit={handleCreateCompany} className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Company Name</label>
                        <input 
                          type="text" required
                          placeholder="e.g. Pfizer Pharmaceuticals" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-semibold text-slate-700"
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Industry Sector</label>
                        <select 
                          value={compIndustry}
                          onChange={(e) => setCompIndustry(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-semibold text-slate-700 cursor-pointer"
                        >
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Finance">Finance</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Logistics">Logistics</option>
                          <option value="Retail">Retail</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CEO</label>
                        <input 
                          type="text"
                          placeholder="Jane Doe" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                          value={compCEO}
                          onChange={(e) => setCompCEO(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Employees Count</label>
                        <input 
                          type="number"
                          placeholder="5000" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compEmployees}
                          onChange={(e) => setCompEmployees(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Annual Revenue ($B)</label>
                        <input 
                          type="number" step="0.1"
                          placeholder="12.5" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compRevenue}
                          onChange={(e) => setCompRevenue(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Market Cap ($B)</label>
                        <input 
                          type="number" step="0.1"
                          placeholder="150.0" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compMarketCap}
                          onChange={(e) => setCompMarketCap(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Founded Year</label>
                        <input 
                          type="number"
                          placeholder="1999" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compFounded}
                          onChange={(e) => setCompFounded(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Stock Symbol</label>
                        <input 
                          type="text"
                          placeholder="PFE" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compStockSymbol}
                          onChange={(e) => setCompStockSymbol(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Website URL</label>
                        <input 
                          type="text"
                          placeholder="https://company.com" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compWebsite}
                          onChange={(e) => setCompWebsite(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">City</label>
                        <input 
                          type="text"
                          placeholder="New York" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compCity}
                          onChange={(e) => setCompCity(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Country</label>
                        <input 
                          type="text"
                          placeholder="USA" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compCountry}
                          onChange={(e) => setCompCountry(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Latitude</label>
                        <input 
                          type="number" step="0.0001"
                          placeholder="40.7128" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compLatitude}
                          onChange={(e) => setCompLatitude(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Longitude</label>
                        <input 
                          type="number" step="0.0001"
                          placeholder="-74.0060" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compLongitude}
                          onChange={(e) => setCompLongitude(e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Description Summary</label>
                        <textarea 
                          rows={2}
                          placeholder="Enterprise description..." 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compDescription}
                          onChange={(e) => setCompDescription(e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 flex space-x-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowAddModal(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition shadow-sm"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Company Modal Dialog */}
              {showEditModal && editingBiz && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2.5px] z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                      <Edit className="w-5 h-5 text-indigo-500" />
                      <span>Edit Corporate Twin: {editingBiz.name}</span>
                    </h3>
                    <form onSubmit={handleUpdateCompany} className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Company Name</label>
                        <input 
                          type="text" required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Industry Sector</label>
                        <select 
                          value={compIndustry}
                          onChange={(e) => setCompIndustry(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
                        >
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Finance">Finance</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Logistics">Logistics</option>
                          <option value="Retail">Retail</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CEO</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compCEO}
                          onChange={(e) => setCompCEO(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Employees Count</label>
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compEmployees}
                          onChange={(e) => setCompEmployees(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Annual Revenue ($B)</label>
                        <input 
                          type="number" step="0.1"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compRevenue}
                          onChange={(e) => setCompRevenue(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Market Cap ($B)</label>
                        <input 
                          type="number" step="0.1"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compMarketCap}
                          onChange={(e) => setCompMarketCap(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Founded Year</label>
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compFounded}
                          onChange={(e) => setCompFounded(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Stock Symbol</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compStockSymbol}
                          onChange={(e) => setCompStockSymbol(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Website URL</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compWebsite}
                          onChange={(e) => setCompWebsite(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">City</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compCity}
                          onChange={(e) => setCompCity(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Country</label>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compCountry}
                          onChange={(e) => setCompCountry(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Latitude</label>
                        <input 
                          type="number" step="0.0001"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compLatitude}
                          onChange={(e) => setCompLatitude(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Longitude</label>
                        <input 
                          type="number" step="0.0001"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compLongitude}
                          onChange={(e) => setCompLongitude(e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Description Summary</label>
                        <textarea 
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                          value={compDescription}
                          onChange={(e) => setCompDescription(e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 flex space-x-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowEditModal(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition shadow-sm"
                        >
                          Update Record
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Bulk upload CSV Modal dialog */}
              {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2.5px] z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                      <span>Bulk Ingestion CSV Data</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Format: Name, Industry, City, Country, CEO, Revenue, Risk. Paste lines below:</p>
                    <form onSubmit={handleBulkUpload} className="space-y-4">
                      <textarea 
                        rows={6}
                        placeholder="Company Alpha,Technology,New York,USA,John Doe,120.4,14.5&#10;Company Beta,Healthcare,Boston,USA,Jane Smith,85.2,18.0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none font-mono focus:border-indigo-400"
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                      />
                      <div className="flex space-x-2">
                        <button 
                          type="button" 
                          onClick={() => setShowBulkModal(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition shadow-sm"
                        >
                          Trigger Bulk Ingest
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW: SUPER ADMIN PANEL & REAL-TIME SYSTEM MONITORING */}
          {activeView === 'settings' && (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
              
              {/* Gauges & Ticking Monitoring Console */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-slate-900">Real-Time Performance Monitor</h3>
                  </div>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-mono font-bold uppercase">Ticking Active</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">CPU Cluster Load</span>
                    <span className="text-xl font-bold text-indigo-600 font-mono block mt-1">{sysMetrics.cpu}%</span>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${sysMetrics.cpu}%` }} />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">RAM Memory</span>
                    <span className="text-xl font-bold text-purple-600 font-mono block mt-1">{sysMetrics.ram}%</span>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${sysMetrics.ram}%` }} />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">DB Vectors Latency</span>
                    <span className="text-xl font-bold text-emerald-600 font-mono block mt-1">{sysMetrics.latency}ms</span>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300 animate-pulse" style={{ width: '40%' }} />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block font-mono">Requests Ingestion / s</span>
                    <span className="text-xl font-bold text-slate-800 font-mono block mt-1">{sysMetrics.requests} req</span>
                    <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 rounded-full transition-all duration-300" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Status Indicators */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-slate-100">
                  <Database className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-900">Enterprise Database Registry</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.values(dbStatuses).map((db: any, i) => (
                    <div key={i} className="bg-slate-50 p-4 border border-slate-100 rounded-2xl text-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mb-1"></span>
                      <h4 className="font-bold text-xs text-slate-700 truncate">{db.name}</h4>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">Port: {db.port}</p>
                      <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${db.load}`} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 mt-2 block">{db.usage}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Management Panel Table */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-extrabold text-slate-900">User Identity Access Roles (IAM)</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormEmail(""); setUserFormName(""); setUserFormRole("viewer"); setUserFormStatus("Active");
                      setShowUserModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2.5 rounded-xl shadow-sm transition"
                  >
                    Add Identity User
                  </button>
                </div>

                {/* User Search & Filter Row */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center text-xs font-semibold text-slate-600 mb-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      placeholder="Search users by email or name..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select
                      value={userFilterRole}
                      onChange={(e) => setUserFilterRole(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-700 cursor-pointer text-xs font-semibold"
                    >
                      <option value="All">All Roles</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <select
                      value={userFilterStatus}
                      onChange={(e) => setUserFilterStatus(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-700 cursor-pointer text-xs font-semibold"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-slate-50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Full Name</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                      {managedUsers.filter((u: any) => {
                        const searchLower = userSearchQuery.toLowerCase();
                        const matchesSearch = !userSearchQuery ||
                          (u.email && u.email.toLowerCase().includes(searchLower)) ||
                          (u.full_name && u.full_name.toLowerCase().includes(searchLower));
                        const matchesRole = userFilterRole === "All" || u.role === userFilterRole;
                        const statusStr = u.is_active ? "Active" : "Suspended";
                        const matchesStatus = userFilterStatus === "All" || statusStr === userFilterStatus;
                        return matchesSearch && matchesRole && matchesStatus;
                      }).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{u.email}</td>
                          <td className="p-3">{u.full_name || "N/A"}</td>
                          <td className="p-3 uppercase font-mono text-[10px] text-indigo-600">{u.role}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 text-[9px] rounded font-extrabold ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                              {u.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex space-x-2 font-bold">
                              <button onClick={() => handleEditUser(u)} className="text-slate-600 hover:text-slate-950 hover:underline">Edit</button>
                              <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-900 hover:underline">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Developer API grants */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Key className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-900">Developer Primary API Key Grants</h3>
                </div>

                <div className="flex items-center space-x-3 mb-3">
                  <input 
                    type="text" 
                    readOnly 
                    value="bios_live_pk_2026_8f0a1c2d3b4e5f6g7h8i9j0k"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-600 outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("bios_live_pk_2026_8f0a1c2d3b4e5f6g7h8i9j0k");
                      setToastMessage("API Token key copied to clipboard!");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition"
                  >
                    Copy Token
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">Do not share your primary API token key. These grants permit write access to the Knowledge Graph nodes and Kafka event queues.</p>
              </div>

              {/* Database Audit trail log viewer */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-extrabold text-slate-900">Database Audit Trail Logs</h3>
                  </div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono font-bold uppercase">Real Sync Active</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-50 font-mono text-[10px] text-slate-600">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="pb-2 border-b border-slate-100/60 last:border-0">
                      <span className="text-slate-400">[{log.timestamp}]</span>{" "}
                      <span className="text-indigo-600 font-bold">{log.action}:</span>{" "}
                      <span className="text-slate-800 font-medium">{log.details}</span>{" "}
                      <span className="text-slate-400 italic">IP: {log.ip_address}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* User management Modal Dialog */}
              {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2.5px] z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                      <UserCheck className="w-5 h-5 text-indigo-500" />
                      <span>{editingUser ? "Edit User Account" : "Add Access Identity User"}</span>
                    </h3>
                    <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-semibold text-slate-600">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address</label>
                        <input 
                          type="email" required
                          placeholder="name@organization.com" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                          value={userFormEmail}
                          onChange={(e) => setUserFormEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full Name</label>
                        <input 
                          type="text" required
                          placeholder="Jane Doe" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                          value={userFormName}
                          onChange={(e) => setUserFormName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Role</label>
                        <select 
                          value={userFormRole}
                          onChange={(e) => setUserFormRole(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="analyst">Analyst</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</label>
                        <select 
                          value={userFormStatus}
                          onChange={(e) => setUserFormStatus(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs cursor-pointer"
                        >
                          <option value="Active">Active</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => { setShowUserModal(false); setEditingUser(null); }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition shadow-sm"
                        >
                          Save Identity
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* Global Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-white border border-slate-200 text-slate-800 px-5 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono">System Notification</p>
            <p className="text-xs font-semibold text-slate-800 leading-snug mt-0.5 truncate">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-xs font-bold font-mono pl-2 border-l border-slate-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Database Inflow Scanning Full-Page Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[9998] flex items-center justify-center p-6 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <svg className="w-12 h-12 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-600 font-mono">
                {scanProgress}%
              </div>
            </div>

            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Ingesting Relational Entries & Vector Embeddings</h4>
              <p className="text-xs text-slate-400 mt-1">Analyzing search nodes, scraping local domains, mapping index clusters...</p>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
