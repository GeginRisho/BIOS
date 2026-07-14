'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Share2, Info, Search, Filter, Maximize } from 'lucide-react';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'corp' | 'partner' | 'competitor' | 'supplier' | 'subsidiary' | 'parent';
  description?: string;
  risk?: number;
  valueSize?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  relation: string;
  type: 'partner' | 'competitor' | 'supplier' | 'subsidiary' | 'parent';
  value?: string;
}

interface RelationshipGraphProps {
  businessName: string;
  mobileMenuOpen?: boolean;
}

// Deterministic string hashing to seed initial coordinates
function getSeededPosition(id: string, index: number, total: number, width: number, height: number) {
  if (id === 'center') {
    return { x: width / 2, y: height / 2 };
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const angle = ((Math.abs(hash) % 100) / 100) * 2 * Math.PI;
  const radius = 120 + (Math.abs(hash) % 120);
  return {
    x: width / 2 + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius
  };
}

function truncateLabel(name: string, maxLength: number = 12): string {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 3) + '...';
}

export default function RelationshipGraph({ businessName, mobileMenuOpen }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const simulationRef = useRef<any>(null);
  const transformRef = useRef<any>(d3.zoomIdentity); // Store zoom state

  // Graph states
  const [activeFilters, setActiveFilters] = useState<string[]>([
    'partner', 'competitor', 'supplier', 'subsidiary', 'parent'
  ]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerWrapperRef = useRef<HTMLDivElement>(null);

  const preFullscreenTransformRef = useRef<any>(null);

  const handleEnterFullscreen = () => {
    if (simulationRef.current) simulationRef.current.stop();
    preFullscreenTransformRef.current = transformRef.current;
    transformRef.current = null;
    filteredNodes.forEach((node) => {
      node.x = undefined;
      node.y = undefined;
      node.fx = undefined;
      node.fy = undefined;
    });
    setIsFullscreen(true);
  };

  const handleExitFullscreen = () => {
    if (simulationRef.current) simulationRef.current.stop();
    transformRef.current = null;
    filteredNodes.forEach((node) => {
      node.x = undefined;
      node.y = undefined;
      node.fx = undefined;
      node.fy = undefined;
    });
    setIsFullscreen(false);
    setTimeout(() => {
      if (svgRef.current && zoomRef.current && preFullscreenTransformRef.current) {
        transformRef.current = preFullscreenTransformRef.current;
        d3.select(svgRef.current)
          .transition()
          .duration(500)
          .call(zoomRef.current.transform, preFullscreenTransformRef.current);
      }
    }, 100);
  };

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(650);
  const [containerHeight, setContainerHeight] = useState(650);

  // Disable body scroll on fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!containerWrapperRef.current) return;

    const updateFromRect = (rectWidth: number) => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      
      let w = rectWidth || 800;
      let h = 650;
      
      if (isFullscreen) {
        w = screenW;
        h = screenH;
      } else {
        if (screenW <= 320) {
          h = 420;
        } else if (screenW <= 360) {
          h = 460;
        } else if (screenW <= 390) {
          h = 500;
        } else if (screenW <= 430) {
          h = 540;
        } else if (screenW < 1024) {
          h = 620;
        } else {
          h = 650;
        }
      }
      
      setWidth(w);
      setHeight(h);
      setContainerHeight(h);
      
      if (screenW < 768) {
        setLayoutMode('mobile');
      } else if (screenW < 1280) {
        setLayoutMode('tablet');
      } else {
        setLayoutMode('desktop');
      }
    };

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      updateFromRect(rect.width);
    });

    observer.observe(containerWrapperRef.current);
    updateFromRect(containerWrapperRef.current.clientWidth);

    return () => {
      observer.disconnect();
    };
  }, [isFullscreen]);

  const isMobile = layoutMode === 'mobile';

  // Enterprise styling color definitions
  const relationshipColors: Record<string, string> = {
    corp: '#10B981',        // Emerald green for center
    partner: '#14B8A6',     // Teal for partners
    competitor: '#F59E0B',  // Orange for competitors
    supplier: '#0D9488',    // Dark Teal for suppliers
    subsidiary: '#34D399',  // Light Emerald for subsidiaries
    parent: '#64748B'       // Slate grey for parents
  };

  const [dbData, setDbData] = useState<{ nodes: Node[], links: Link[] } | null>(null);

  useEffect(() => {
    const fetchGraph = async () => {
      setIsLoading(true);
      try {
        const isLocal = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const url = (baseUrl && !isLocal)
          ? `${baseUrl.replace(/\/$/, "")}/api/v1/graph/d3` 
          : "http://127.0.0.1:8003/api/v1/graph/d3";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.nodes && data.nodes.length > 1) {
            // Map backend nodes & links to the format expected by D3 and frontend RelationshipGraph
            const mappedNodes: Node[] = data.nodes.map((n: any) => {
              // Decide if it's the corporate center
              const isCorp = n.name && (n.name.toLowerCase().includes(businessName.toLowerCase()) || businessName.toLowerCase().includes(n.name.toLowerCase()));
              const mappedType = isCorp ? "corp" : (n.group?.toLowerCase() || "partner");
              return {
                id: String(n.id),
                name: n.name || `Node ${n.id}`,
                type: mappedType as any,
                description: n.description || `${n.name} corporate node registered in Knowledge Graph.`,
                risk: n.risk || Math.floor(Math.random() * 20 + 5),
                valueSize: isCorp ? 34 : 24
              };
            });

            // Make sure there is exactly one 'center' node representing the businessName
            let hasCenter = mappedNodes.some(n => n.type === 'corp');
            if (!hasCenter) {
              // Find the closest match or force the first one to be center, or insert center
              mappedNodes.push({
                id: "center",
                name: businessName,
                type: "corp",
                description: "Audited Center Corporate Twin Profile",
                risk: 8,
                valueSize: 34
              });
            } else {
              // Ensure the center node ID is 'center' for links mapping
              const centerNode = mappedNodes.find(n => n.type === 'corp');
              if (centerNode) {
                centerNode.id = 'center';
              }
            }

            const mappedLinks: Link[] = data.links.map((l: any) => {
              // Map source & target
              let src = String(l.source);
              let tgt = String(l.target);
              
              // If source/target matches the original center node ID, map to 'center'
              const sourceNode = data.nodes.find((n: any) => n.id === l.source);
              const targetNode = data.nodes.find((n: any) => n.id === l.target);
              
              if (sourceNode && sourceNode.name && (sourceNode.name.toLowerCase().includes(businessName.toLowerCase()) || businessName.toLowerCase().includes(sourceNode.name.toLowerCase()))) {
                src = 'center';
              }
              if (targetNode && targetNode.name && (targetNode.name.toLowerCase().includes(businessName.toLowerCase()) || businessName.toLowerCase().includes(targetNode.name.toLowerCase()))) {
                tgt = 'center';
              }

              const relation = l.value || "LINKED_TO";
              const relationType = relation.toLowerCase().includes("compet") ? "competitor" : (relation.toLowerCase().includes("suppl") ? "supplier" : "partner");

              return {
                source: src,
                target: tgt,
                relation: relation,
                type: relationType as any,
                value: relationType === 'competitor' ? "High rivalry" : "$1.2B/yr"
              };
            });

            setDbData({ nodes: mappedNodes, links: mappedLinks });
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch graph data from backend, falling back to local seeded data:", err);
      }
      setDbData(null); // Fallback
      setIsLoading(false);
    };

    fetchGraph();
  }, [businessName]);

  // Generate data deterministically based on Selected Business Name
  const graphData = useMemo(() => {
    if (dbData) return dbData;

    const nameLower = businessName?.toLowerCase() || "";
    let rawNodes: Node[] = [
      { id: "center", name: businessName, type: "corp", description: "Audited Center Corporate Twin Profile", risk: 8, valueSize: 34 },
    ];
    let rawLinks: Link[] = [];

    if (nameLower.includes("apple")) {
      rawNodes.push(
        { id: "dhl", name: "DHL Supply Chain", type: "partner", description: "Global warehouse and express parcel partner.", risk: 10, valueSize: 24 },
        { id: "infosys", name: "Infosys Ltd.", type: "partner", description: "IT consulting and system integration partner.", risk: 12, valueSize: 24 },
        { id: "foxconn", name: "Foxconn Shenzhen", type: "partner", description: "Assembly gigafactory partner.", risk: 25, valueSize: 24 },
        { id: "google", name: "Google LLC", type: "competitor", description: "Rival in smartphone OS and search engines.", risk: 8, valueSize: 24 },
        { id: "microsoft", name: "Microsoft Corporation", type: "competitor", description: "Rival in productivity tools, cloud, and AI.", risk: 6, valueSize: 24 },
        { id: "samsung", name: "Samsung Electronics", type: "competitor", description: "Rival in mobile screens, memory, and devices.", risk: 11, valueSize: 24 },
        { id: "tsmc", name: "TSMC Co.", type: "supplier", description: "Foundry supplier of neural microchips.", risk: 18, valueSize: 24 },
        { id: "sino", name: "Sino Logistics", type: "supplier", description: "Cargo container sea freight supplier.", risk: 16, valueSize: 24 },
        { id: "london_office", name: "Apple London Office", type: "subsidiary", description: "Regional headquarters handling EU markets.", risk: 4, valueSize: 22 },
        { id: "germany_office", name: "Apple Germany GmbH", type: "subsidiary", description: "European sales subsidiary.", risk: 5, valueSize: 22 },
        { id: "berkshire", name: "Berkshire Hathaway", type: "parent", description: "Major institutional shareowner and parent backer.", risk: 3, valueSize: 26 }
      );
      rawLinks.push(
        { source: "dhl", target: "center", relation: "Distributes products", type: "partner", value: "$4.5B/yr" },
        { source: "infosys", target: "center", relation: "Consults neural pipelines", type: "partner", value: "$1.2B/yr" },
        { source: "foxconn", target: "center", relation: "Assembles hardware", type: "partner", value: "$48B/yr" },
        { source: "center", target: "google", relation: "Competes in OS market", type: "competitor", value: "High rivalry" },
        { source: "center", target: "microsoft", relation: "Competes in AI clouds", type: "competitor", value: "High rivalry" },
        { source: "center", target: "samsung", relation: "Competes in screens", type: "competitor", value: "Moderate rivalry" },
        { source: "tsmc", target: "center", relation: "Supplies core silicon chips", type: "supplier", value: "$15B/yr" },
        { source: "sino", target: "center", relation: "Ships overseas cargo", type: "supplier", value: "$2.4B/yr" },
        { source: "center", target: "london_office", relation: "Directly owns EU Hub", type: "subsidiary", value: "100% Equity" },
        { source: "center", target: "germany_office", relation: "Directly owns EU Sales", type: "subsidiary", value: "100% Equity" },
        { source: "berkshire", target: "center", relation: "Owns 5.7% corporate equity", type: "parent", value: "Major Stake" }
      );
    } else if (nameLower.includes("tesla")) {
      rawNodes.push(
        { id: "panasonic", name: "Panasonic Energy", type: "partner", description: "Joint lithium cell production partner.", risk: 14, valueSize: 24 },
        { id: "google", name: "Google LLC", type: "partner", description: "In-car map services partner.", risk: 7, valueSize: 24 },
        { id: "byd", name: "BYD Auto", type: "competitor", description: "Primary competitor in consumer electric cars.", risk: 20, valueSize: 24 },
        { id: "samsung", name: "Samsung Electronics", type: "competitor", description: "Competitor in autopilot chips packaging.", risk: 11, valueSize: 24 },
        { id: "nvidia", name: "NVIDIA Corp", type: "supplier", description: "Supplier of H100 AI neural compute grids.", risk: 9, valueSize: 24 },
        { id: "tsmc", name: "TSMC Co.", type: "supplier", description: "Foundry supplier for autopilot boards.", risk: 15, valueSize: 24 },
        { id: "berlin_gigafactory", name: "Gigafactory Berlin", type: "subsidiary", description: "European assembly subsidiary facility.", risk: 10, valueSize: 22 },
        { id: "musk_trust", name: "Musk Family Trust", type: "parent", description: "Core shareholder holding board control.", risk: 18, valueSize: 26 }
      );
      rawLinks.push(
        { source: "panasonic", target: "center", relation: "Produces battery cell packs", type: "partner", value: "$6.5B/yr" },
        { source: "google", target: "center", relation: "Provides telemetry maps", type: "partner", value: "$300M/yr" },
        { source: "center", target: "byd", relation: "Competes in EV pricing", type: "competitor", value: "High rivalry" },
        { source: "center", target: "samsung", relation: "Competes in autonomous microchips", type: "competitor", value: "Low rivalry" },
        { source: "nvidia", target: "center", relation: "Supplies computer hardware", type: "supplier", value: "$1.8B/yr" },
        { source: "tsmc", target: "center", relation: "Fabricates custom silicon", type: "supplier", value: "$950M/yr" },
        { source: "center", target: "berlin_gigafactory", relation: "Directly owns assembly", type: "subsidiary", value: "100% Equity" },
        { source: "musk_trust", target: "center", relation: "Controls 13% voting power", type: "parent", value: "Board Seat" }
      );
    } else {
      // General layout
      rawNodes.push(
        { id: "dhl", name: "DHL Supply Chain", type: "partner", description: "Global express shipping partner.", risk: 8, valueSize: 24 },
        { id: "competitor_alpha", name: "Competitor Alpha", type: "competitor", description: "Rival in market share bid processes.", risk: 18, valueSize: 24 },
        { id: "sino", name: "Sino Logistics", type: "supplier", description: "Cargo container sea freight supplier.", risk: 15, valueSize: 24 },
        { id: "sub_office", name: "Regional Branch LLC", type: "subsidiary", description: "Customer success subsidiary.", risk: 4, valueSize: 22 },
        { id: "parent_corp", name: "Apex Parent Corp", type: "parent", description: "Holding company holding corporate stock.", risk: 6, valueSize: 26 }
      );
      rawLinks.push(
        { source: "dhl", target: "center", relation: "Delivers customer shipments", type: "partner", value: "$15M/yr" },
        { source: "center", target: "competitor_alpha", relation: "Competes for bid proposals", type: "competitor", value: "High rivalry" },
        { source: "sino", target: "center", relation: "Supplies packaging materials", type: "supplier", value: "$4.5M/yr" },
        { source: "center", target: "sub_office", relation: "Owns regional operations", type: "subsidiary", value: "100% Ownership" },
        { source: "parent_corp", target: "center", relation: "Holds absolute capital stock", type: "parent", value: "Primary Parent" }
      );
    }

    return { nodes: rawNodes, links: rawLinks };
  }, [businessName]);

  // Filter nodes & links
  const { filteredNodes, filteredLinks } = useMemo(() => {
    const nodes = graphData.nodes.filter(n => {
      if (n.type === 'corp') return true;
      const matchesFilter = activeFilters.includes(n.type);
      const matchesSearch = nodeSearchQuery === "" || n.name.toLowerCase().includes(nodeSearchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    const filteredNodeIds = new Set(nodes.map(n => n.id));

    const links = graphData.links.filter(l => {
      const srcId = typeof l.source === 'object' ? (l.source as Node).id : l.source;
      const tgtId = typeof l.target === 'object' ? (l.target as Node).id : l.target;
      const matchesFilter = activeFilters.includes(l.type);
      return matchesFilter && filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });

    return { filteredNodes: nodes, filteredLinks: links };
  }, [graphData, activeFilters, nodeSearchQuery]);

  // D3 zoom handlers
  const handleZoom = (factor: number) => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, factor);
    }
  };

  const handleFitScreen = () => {
    if (svgRef.current && zoomRef.current && filteredNodes.length > 0) {
      const svg = d3.select(svgRef.current);
      
      // Calculate bounding box of all node coordinates
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      filteredNodes.forEach(d => {
        if (d.x !== undefined && d.y !== undefined) {
          minX = Math.min(minX, d.x);
          maxX = Math.max(maxX, d.x);
          minY = Math.min(minY, d.y);
          maxY = Math.max(maxY, d.y);
        }
      });

      if (minX === Infinity) return;

      const graphW = maxX - minX + 120;
      const graphH = maxY - minY + 120;
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      const scale = Math.max(0.4, Math.min(2.0, Math.min(width / graphW, height / graphH)));
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-midX, -midY);

      svg.transition().duration(750).call(zoomRef.current.transform, transform);
    }
  };

  const handleReset = () => {
    setSelectedNode(null);
    setSelectedLink(null);
    setNodeSearchQuery("");
    setActiveFilters(['partner', 'competitor', 'supplier', 'subsidiary', 'parent']);
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const fitGraph = (targetNode?: Node | null) => {
    if (!svgRef.current || !zoomRef.current || filteredNodes.length === 0) return;
    const svg = d3.select(svgRef.current);
    
    const isMobileOrTablet = layoutMode === 'mobile' || layoutMode === 'tablet' || window.innerWidth < 1280 || isFullscreen;
    
    if (isMobileOrTablet) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      filteredNodes.forEach((d) => {
        if (d.x !== undefined && d.y !== undefined) {
          const r = layoutMode === 'mobile' ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24);
          // Keep a small padding (20-24px, target 22px)
          const padding = 22;
          minX = Math.min(minX, d.x - r - padding);
          maxX = Math.max(maxX, d.x + r + padding);
          minY = Math.min(minY, d.y - r - padding);
          maxY = Math.max(maxY, d.y + r + padding);
        }
      });
      
      if (minX !== Infinity) {
        let graphW = maxX - minX;
        let graphH = maxY - minY;
        
        if (graphW <= 0) graphW = 100;
        if (graphH <= 0) graphH = 100;
        
        const scaleX = (width * 0.92) / graphW;
        const scaleY = (height * 0.92) / graphH;
        let scale = Math.min(scaleX, scaleY);
        
        // Restrict scale bounds to reasonable limits
        scale = Math.max(0.15, Math.min(2.5, scale));
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const tx = width / 2 - centerX * scale;
        const ty = height / 2 - centerY * scale;
        
        const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
        
        svg.transition().duration(500).call(zoomRef.current.transform, transform);
      }
    } else {
      // Desktop focus/centering remains unchanged
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        const transform = d3.zoomIdentity
          .translate(width / 2 - targetNode.x * 1.2, height / 2 - targetNode.y * 1.2)
          .scale(1.2);
        svg.transition().duration(500).call(zoomRef.current.transform, transform);
      } else {
        const transform = d3.zoomIdentity
          .translate(0, 0)
          .scale(1);
        svg.transition().duration(500).call(zoomRef.current.transform, transform);
      }
    }
  };

  // Center the graph automatically after data, viewport, selection, filters, fullscreen or drawer changes
  useEffect(() => {
    fitGraph(selectedNode);
  }, [selectedNode, layoutMode, businessName, activeFilters, filteredNodes, filteredLinks, mobileMenuOpen, isFullscreen, width, height]);

  // Initialize and run simulation
  useEffect(() => {
    if (!svgRef.current) return;

    setIsLoading(true);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g").attr("class", "graph-container");

    // Re-apply stored transform if it exists
    if (transformRef.current) {
      container.attr("transform", transformRef.current);
    }

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        transformRef.current = event.transform; // Save transform state
        
        // Hide labels at low zoom, except selected/hovered ones
        const scale = event.transform.k;
        const isMobileOrTablet = layoutMode === 'mobile' || layoutMode === 'tablet' || window.innerWidth < 1280 || isFullscreen;
        if (isMobileOrTablet) {
          svg.selectAll(".node-label").style("opacity", (d: any) => {
            const isSelected = selectedNode?.id === d.id;
            const isHovered = hoveredNode?.id === d.id;
            if (isSelected || isHovered || scale >= 0.8) return 1;
            return 0;
          });
          
          // Hide edge labels at low zoom on mobile/tablet to avoid clutter
          svg.selectAll(".edge-label").style("opacity", scale >= 0.8 ? 1 : 0);
        } else {
          svg.selectAll(".node-label").style("opacity", 1);
          svg.selectAll(".edge-label").style("opacity", 1);
        }
      });

    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Seed initial coordinates deterministically before simulation starts
    filteredNodes.forEach((node, i) => {
      if (node.x === undefined || node.y === undefined) {
        const seeded = getSeededPosition(node.id, i, filteredNodes.length, width, height);
        node.x = seeded.x;
        node.y = seeded.y;
      }
    });

    // Arrow markers definitions
    const defs = container.append("defs");
    Object.keys(relationshipColors).forEach((type) => {
      defs.append("marker")
        .attr("id", `marker-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 32)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", relationshipColors[type]);
    });

    // Drop shadow filter
    const shadow = defs.append("filter")
      .attr("id", "node-shadow-premium")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    shadow.append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "4")
      .attr("stdDeviation", "5")
      .attr("flood-opacity", "0.06")
      .attr("flood-color", "#0f172a");

    const isMobile = layoutMode === 'mobile';
    const isTablet = layoutMode === 'tablet';
    const linkDistance = isMobile ? 110 : (isTablet ? 120 : 180);
    const chargeStrength = isMobile ? -350 : (isTablet ? -400 : -800);
    const collideRadius = (d: any) => {
      const baseSize = isMobile ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24);
      return baseSize + (isMobile ? 24 : (isTablet ? 30 : 54));
    };

    // Force simulation configurations (strong collision & constraints for clean positions)
    const simulation = d3.forceSimulation<Node>(filteredNodes)
      .force("link", d3.forceLink<Node, Link>(filteredLinks).id((d) => d.id).distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(collideRadius))
      .alphaDecay(0.06);

    simulationRef.current = simulation;

    // Draw links
    const link = container.append("g")
      .selectAll("line")
      .data(filteredLinks)
      .enter().append("line")
      .attr("class", "animated-link cursor-pointer transition")
      .attr("stroke", (d) => relationshipColors[d.type] || "#94A3B8")
      .attr("stroke-width", 2)
      .attr("marker-end", (d) => `url(#marker-${d.type})`)
      .on("click", (event, d) => {
        setSelectedLink(d);
        setSelectedNode(null);
        setShowMobileInspector(true);
        event.stopPropagation();
      });

    // Link Labels
    const linkLabel = container.append("g")
      .selectAll("g")
      .data(filteredLinks)
      .enter().append("g")
      .attr("class", "edge-label cursor-pointer");

    linkLabel.append("rect")
      .attr("fill", "#ffffff")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("height", 16)
      .attr("width", (d) => d.relation.length * 5.2 + 12)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    linkLabel.append("text")
      .attr("font-size", "8px")
      .attr("font-weight", "600")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .attr("dy", "11")
      .text((d) => d.relation);

    // Draw nodes
    const node = container.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, Node>()
         .on("start", dragstarted)
         .on("drag", dragged)
         .on("end", dragended)
      )
      .attr("filter", "url(#node-shadow-premium)")
      .attr("class", "cursor-pointer");

    // Selected Highlight Ring
    node.append("circle")
      .attr("class", "highlight-ring")
      .attr("r", (d) => {
        const r = isMobile ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24);
        return r + 6;
      })
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 3)
      .attr("stroke-opacity", (d) => (d.id === "center" || selectedNode?.id === d.id ? 1 : 0))
      .style("stroke-dasharray", "4, 2");

    // Main Node Circle
    node.append("circle")
      .attr("r", (d) => isMobile ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24))
      .attr("fill", (d) => (d.type === "corp" ? "#10B981" : "#ffffff"))
      .attr("stroke", (d) => relationshipColors[d.type] || "#64748B")
      .attr("stroke-width", 3)
      .on("click", (event, d) => {
        setSelectedNode(d);
        setSelectedLink(null);
        setShowMobileInspector(true);
        event.stopPropagation();
      })
      .on("mouseover", (event, d) => {
        setHoveredNode(d);
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltipPos({ x: mx + 15, y: my + 15 });
      })
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltipPos({ x: mx + 15, y: my + 15 });
      })
      .on("mouseout", () => {
        setHoveredNode(null);
      });

    // In-node Initials Symbol
    node.append("text")
      .attr("dy", "3")
      .attr("text-anchor", "middle")
      .attr("font-size", isMobile ? "7px" : "9px")
      .attr("font-weight", "800")
      .attr("fill", (d) => (d.type === "corp" ? "#ffffff" : "#1f2937"))
      .attr("class", "select-none pointer-events-none")
      .text((d) => {
        if (d.type === "corp") return "HQ";
        if (d.type === "partner") return "PTNR";
        if (d.type === "competitor") return "RIVL";
        if (d.type === "supplier") return "SUPP";
        if (d.type === "subsidiary") return "SUB";
        return "PRNT";
      });

    // Label names below nodes (no overlap spacing check)
    node.append("text")
      .attr("dy", (d) => {
        const r = isMobile ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24);
        return r + 16;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", isMobile ? "8px" : "10px")
      .attr("font-weight", "700")
      .attr("fill", "#1f2937")
      .attr("class", "node-label select-none pointer-events-none")
      .text((d) => {
        const isSelected = selectedNode?.id === d.id;
        const isHovered = hoveredNode?.id === d.id;
        if (isSelected || isHovered) return d.name;
        return truncateLabel(d.name, 12);
      });

    let tickCount = 0;
    // Simulation tick loop
    simulation.on("tick", () => {
      tickCount++;
      const isMobileOrTablet = layoutMode === 'mobile' || layoutMode === 'tablet' || window.innerWidth < 1280 || isFullscreen;
      if (isMobileOrTablet && (tickCount === 25 || tickCount === 50 || tickCount === 80 || tickCount === 120 || tickCount === 160)) {
        fitGraph(selectedNode);
      }

      // 1. Constrain node coordinates to stay inside the viewport bounds
      filteredNodes.forEach((d) => {
        const r = (isMobile ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24)) + 10;
        d.x = Math.max(r, Math.min(width - r, d.x || 0));
        d.y = Math.max(r, Math.min(height - r, d.y || 0));
      });

      // 2. Collision detection for labels
      if (isMobileOrTablet) {
        const labelBoxes: { x: number; y: number; w: number; h: number }[] = [];
        const sortedNodes = [...filteredNodes].sort((a, b) => (a.y || 0) - (b.y || 0));
        const resolvedOffsets: Record<string, number> = {};
        
        sortedNodes.forEach((d) => {
          const r = isMobile ? (d.valueSize ?? 24) * 0.8 : (d.valueSize ?? 24);
          const isSelected = selectedNode?.id === d.id;
          const isHovered = hoveredNode?.id === d.id;
          const currentScale = transformRef.current?.k ?? 1;
          const isVisible = isSelected || isHovered || currentScale > 0.8;
          
          let offset = r + (isMobile ? 12 : 16);
          if (!isVisible) {
            resolvedOffsets[d.id] = offset;
            return;
          }
          
          const nameText = isSelected || isHovered ? d.name : truncateLabel(d.name, 12);
          const w = nameText.length * (isMobile ? 5.5 : 7);
          const h = isMobile ? 10 : 12;
          
          let labelX = d.x || 0;
          let labelY = (d.y || 0) + offset;
          
          let hasOverlap = true;
          let attempts = 0;
          while (hasOverlap && attempts < 10) {
            hasOverlap = false;
            attempts++;
            for (const box of labelBoxes) {
              const dx = Math.abs(labelX - box.x);
              const dy = Math.abs(labelY - box.y);
              if (dx < (w + box.w) / 2 && dy < (h + box.h) / 2) {
                hasOverlap = true;
                labelY = box.y + (h + box.h) / 2 + 2;
                break;
              }
            }
          }
          
          labelBoxes.push({ x: labelX, y: labelY, w, h });
          resolvedOffsets[d.id] = labelY - (d.y || 0);
        });
        
        node.select(".node-label").attr("dy", (d: any) => resolvedOffsets[d.id] || (isMobile ? (d.valueSize ?? 24) * 0.8 + 12 : (d.valueSize ?? 24) + 16));
      } else {
        node.select(".node-label").attr("dy", (d: any) => (d.valueSize ?? 24) + 16);
      }

      link
        .attr("x1", (d) => {
          const src = d.source as Node;
          const tgt = d.target as Node;
          const dx = (tgt.x || 0) - (src.x || 0);
          const dy = (tgt.y || 0) - (src.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = isMobile ? (src.valueSize ?? 24) * 0.8 : (src.valueSize ?? 24);
          return (src.x || 0) + (dx / dist) * radius;
        })
        .attr("y1", (d) => {
          const src = d.source as Node;
          const tgt = d.target as Node;
          const dx = (tgt.x || 0) - (src.x || 0);
          const dy = (tgt.y || 0) - (src.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = isMobile ? (src.valueSize ?? 24) * 0.8 : (src.valueSize ?? 24);
          return (src.y || 0) + (dy / dist) * radius;
        })
        .attr("x2", (d) => {
          const src = d.source as Node;
          const tgt = d.target as Node;
          const dx = (tgt.x || 0) - (src.x || 0);
          const dy = (tgt.y || 0) - (src.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = (isMobile ? (tgt.valueSize ?? 24) * 0.8 : (tgt.valueSize ?? 24)) + 8;
          return (tgt.x || 0) - (dx / dist) * radius;
        })
        .attr("y2", (d) => {
          const src = d.source as Node;
          const tgt = d.target as Node;
          const dx = (tgt.x || 0) - (src.x || 0);
          const dy = (tgt.y || 0) - (src.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = (isMobile ? (tgt.valueSize ?? 24) * 0.8 : (tgt.valueSize ?? 24)) + 8;
          return (tgt.y || 0) - (dy / dist) * radius;
        });

      node.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);

      linkLabel.attr("transform", (d) => {
        const x1 = (d.source as Node).x || 0;
        const y1 = (d.source as Node).y || 0;
        const x2 = (d.target as Node).x || 0;
        const y2 = (d.target as Node).y || 0;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const rectW = d.relation.length * 5.2 + 12;
        return `translate(${midX - rectW / 2}, ${midY - 8})`;
      });
    });

    // Stop loader when simulation settles or has run enough ticks
    simulation.on("end", () => {
      setIsLoading(false);
      fitGraph(selectedNode);
    });

    // Timeout safety for the loading spinner
    const loaderTimeout = setTimeout(() => {
      setIsLoading(false);
      fitGraph(selectedNode);
    }, 850);

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      clearTimeout(loaderTimeout);
    };
  }, [filteredNodes, filteredLinks, width, height, layoutMode, isFullscreen]);

  // Update selected rings & label opacity dynamically on selection/hover changes
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Highlight ring visibility
    d3.select(svgRef.current)
      .selectAll(".highlight-ring")
      .attr("stroke-opacity", (d: any) => (d.id === "center" || selectedNode?.id === d.id ? 1 : 0));

    // Dynamic zoom label visibility helper
    const currentScale = transformRef.current?.k ?? 1;
    const isMobileOrTablet = layoutMode === 'mobile' || layoutMode === 'tablet' || window.innerWidth < 1280 || isFullscreen;

    if (isMobileOrTablet) {
      d3.select(svgRef.current)
        .selectAll(".node-label")
        .style("opacity", (d: any) => {
          const isSelected = selectedNode?.id === d.id;
          const isHovered = hoveredNode?.id === d.id;
          if (isSelected || isHovered || currentScale >= 0.8) return 1;
          return 0;
        })
        .text((d: any) => {
          const isSelected = selectedNode?.id === d.id;
          const isHovered = hoveredNode?.id === d.id;
          if (isSelected || isHovered) return d.name;
          return truncateLabel(d.name, 12);
        });

      // Hide edge labels below zoom 0.8
      d3.select(svgRef.current)
        .selectAll(".edge-label")
        .style("opacity", currentScale >= 0.8 ? 1 : 0);
    } else {
      // Desktop behavior remains unchanged
      d3.select(svgRef.current)
        .selectAll(".node-label")
        .style("opacity", 1)
        .text((d: any) => d.name);

      d3.select(svgRef.current)
        .selectAll(".edge-label")
        .style("opacity", 1);
    }
  }, [selectedNode, hoveredNode, layoutMode, isFullscreen]);

  // Count items
  const partnersCount = graphData.nodes.filter(n => n.type === 'partner').length;
  const competitorsCount = graphData.nodes.filter(n => n.type === 'competitor').length;
  const suppliersCount = graphData.nodes.filter(n => n.type === 'supplier').length;
  const subsidiariesCount = graphData.nodes.filter(n => n.type === 'subsidiary').length;
  const parentCount = graphData.nodes.filter(n => n.type === 'parent').length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in">
      <style>{`
        @keyframes flow-dash {
          to { stroke-dashoffset: -20; }
        }
        .animated-link {
          stroke-dasharray: 5, 3;
          animation: flow-dash 1.5s infinite linear;
        }
      `}</style>

      {/* TOP INFORMATION SUMMARY PANEL */}
      <div className="col-span-4 bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm grid grid-cols-2 md:grid-cols-6 gap-4 text-center select-none">
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Twin Center</span>
          <span className="text-xs font-extrabold text-emerald-600 truncate block mt-1">{businessName}</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Partners</span>
          <span className="text-xs font-extrabold text-slate-800 block mt-1">{partnersCount} Linked</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Competitors</span>
          <span className="text-xs font-extrabold text-slate-800 block mt-1">{competitorsCount} Rivals</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Suppliers</span>
          <span className="text-xs font-extrabold text-slate-800 block mt-1">{suppliersCount} Channels</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Subsidiaries</span>
          <span className="text-xs font-extrabold text-slate-800 block mt-1">{subsidiariesCount} Nodes</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Parent Support</span>
          <span className="text-xs font-extrabold text-slate-800 block mt-1">{parentCount} Holding</span>
        </div>
      </div>

      {/* GRAPH CANVAS (3 Cols) */}
      <div className="xl:col-span-3 flex flex-col space-y-4 relative w-full max-w-full overflow-hidden">
        <div 
          ref={containerWrapperRef}
          className={
            isFullscreen 
              ? "fixed inset-0 z-[150] bg-slate-50 w-screen h-screen flex flex-col animate-in fade-in duration-200 overflow-hidden" 
              : "rounded-3xl border border-slate-200/80 bg-slate-50 relative shadow-inner overflow-hidden w-full max-w-full"
          }
          style={{ 
            touchAction: 'none',
            height: isFullscreen ? '100vh' : `${containerHeight}px`,
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            position: isFullscreen ? 'fixed' : 'relative',
            paddingTop: isFullscreen ? 'env(safe-area-inset-top, 0px)' : '0px',
            paddingBottom: isFullscreen ? 'env(safe-area-inset-bottom, 0px)' : '0px',
            paddingLeft: isFullscreen ? 'env(safe-area-inset-left, 0px)' : '0px',
            paddingRight: isFullscreen ? 'env(safe-area-inset-right, 0px)' : '0px',
          }}
        >
          
          {isLoading && (
            <div className="absolute inset-0 bg-slate-50/70 backdrop-blur-sm z-20 flex items-center justify-center">
              <div className="text-center space-y-2">
                <svg className="w-10 h-10 text-emerald-500 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Computing Layout Coordinates...</p>
              </div>
            </div>
          )}

          <svg 
            ref={svgRef} 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${width} ${height}`} 
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full block touch-none" 
            onClick={(e) => {
              if (e.target === svgRef.current && (layoutMode === 'mobile' || layoutMode === 'tablet') && !isFullscreen) {
                handleEnterFullscreen();
              }
            }}
          />

          {/* Floating Tooltip */}
          {hoveredNode && (
            <div 
              className="absolute pointer-events-none z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-xl text-white text-[10px] space-y-1.5 transition-all max-w-[200px]"
              style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
            >
              <h5 className="font-extrabold text-xs text-emerald-400 truncate">{hoveredNode.name}</h5>
              <div className="flex justify-between font-bold">
                <span className="text-slate-400 uppercase">Role:</span>
                <span className="uppercase text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono">{hoveredNode.type}</span>
              </div>
              {hoveredNode.risk !== undefined && (
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400 uppercase">Risk Index:</span>
                  <span className="text-red-400">{hoveredNode.risk}%</span>
                </div>
              )}
              {hoveredNode.description && (
                <p className="text-slate-300 italic pt-1 border-t border-slate-800 text-[9px] line-clamp-2">
                  &ldquo;{hoveredNode.description}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Floating Canvas controls (Desktop only) */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200/80 p-1.5 rounded-xl shadow-md hidden xl:flex space-x-1">
            <button 
              onClick={() => handleZoom(1.2)} 
              className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0" 
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleZoom(0.8)} 
              className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0" 
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button 
              onClick={handleFitScreen} 
              className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0" 
              title="Fit to Screen"
            >
              <Maximize className="w-5 h-5" />
            </button>
            <button 
              onClick={handleReset} 
              className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0" 
              title="Reset Layout & Filter"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Top Action Bar */}
          <div 
            className="xl:hidden absolute z-10 pointer-events-none"
            style={{
              top: 'calc(16px + env(safe-area-inset-top, 0px))',
              left: 'calc(16px + env(safe-area-inset-left, 0px))',
              right: 'calc(16px + env(safe-area-inset-right, 0px))',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            {/* Top row: Zoom+, Zoom-, Fullscreen */}
            <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 p-1 rounded-xl shadow-md flex gap-1 pointer-events-auto shrink-0">
              <button 
                onClick={() => handleZoom(1.2)} 
                className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0 cursor-pointer" 
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleZoom(0.8)} 
                className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0 cursor-pointer" 
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button 
                onClick={() => isFullscreen ? handleExitFullscreen() : handleEnterFullscreen()} 
                className="w-11 h-11 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center shrink-0 cursor-pointer" 
                style={{ minWidth: '44px', minHeight: '44px' }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>

            {/* Second row: Filters, Close */}
            <div className="flex gap-2 pointer-events-auto shrink-0">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="bg-white/90 backdrop-blur-md border border-slate-200/80 px-3 rounded-xl shadow-md text-slate-700 font-bold text-[10px] flex items-center justify-center space-x-1.5 h-11 cursor-pointer"
                style={{ minWidth: '80px', minHeight: '44px' }}
              >
                <Filter className="w-4 h-4 text-emerald-500" />
                <span>Filters</span>
              </button>
              {isFullscreen && (
                <button
                  onClick={handleExitFullscreen}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 px-3 rounded-xl shadow-md text-red-600 font-extrabold text-[10px] flex items-center justify-center space-x-1.5 h-11 cursor-pointer animate-in fade-in duration-200"
                  style={{ minWidth: '80px', minHeight: '44px' }}
                >
                  <span>Close</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Bottom Action Bar */}
          <div 
            className="xl:hidden absolute z-10 pointer-events-none flex flex-wrap justify-between items-center"
            style={{
              bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              left: 'calc(16px + env(safe-area-inset-left, 0px))',
              right: 'calc(16px + env(safe-area-inset-right, 0px))',
              gap: '12px'
            }}
          >
            <div className="flex items-end select-none pointer-events-auto relative shrink-0">
              <button 
                onClick={() => setShowLegend(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl shadow-md text-slate-600 hover:text-slate-900 transition flex items-center justify-center space-x-1 text-[10px] font-bold h-11 px-3 cursor-pointer"
                style={{ minWidth: '80px', minHeight: '44px' }}
              >
                <span>🗺️</span>
                <span>Legend</span>
              </button>
            </div>

            <div className="flex space-x-2 pointer-events-auto shrink-0">
              {(selectedNode || selectedLink) && (
                <button
                  onClick={() => setShowMobileInspector(true)}
                  className="bg-white/90 backdrop-blur-md border border-slate-200/80 px-3 rounded-xl shadow-md text-slate-700 font-bold text-[10px] flex items-center justify-center space-x-1.5 h-11 cursor-pointer"
                  style={{ minWidth: '80px', minHeight: '44px' }}
                >
                  <Info className="w-4 h-4 text-emerald-500" />
                  <span>Details</span>
                </button>
              )}
              <button
                onClick={handleReset}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-11 h-11 rounded-full shadow-lg transition active:scale-95 flex items-center justify-center cursor-pointer"
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Reset Layout"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Floating Expandable Legend Button for Relationship Graph (Desktop only) */}
          <div className="absolute bottom-4 left-4 xl:left-auto xl:right-4 z-[999] hidden xl:flex flex-col items-start xl:items-end select-none">
            {showLegend && (
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 px-3.5 py-2.5 rounded-2xl shadow-md text-[9px] mb-2 space-y-1.5 animate-in slide-in-from-bottom-2 duration-150">
                <span className="font-bold text-slate-400 uppercase tracking-wider block font-mono">Legend</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600 font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Main Twin (HQ)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                    <span>Partners (Teal)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span>Competitors</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                    <span>Suppliers</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    <span>Subsidiaries</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>
                    <span>Parent Co</span>
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
      </div>

      {/* DESKTOP FILTERS & INSPECTOR PANEL (Hidden on Mobile) */}
      <div className="hidden xl:flex xl:col-span-1 flex-col space-y-4">
        
        {/* Filters Card */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm text-xs space-y-3">
          <h4 className="font-bold text-slate-800 flex items-center space-x-2 pb-2.5 border-b border-slate-100">
            <Filter className="w-4 h-4 text-emerald-500" />
            <span>Interactive Filters</span>
          </h4>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search graph nodes..."
              value={nodeSearchQuery}
              onChange={(e) => setNodeSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            {[
              { key: 'partner', label: 'Partners (Teal)', color: 'bg-teal-500' },
              { key: 'competitor', label: 'Competitors (Orange)', color: 'bg-amber-500' },
              { key: 'supplier', label: 'Suppliers (Indigo)', color: 'bg-indigo-500' },
              { key: 'subsidiary', label: 'Subsidiaries (Blue)', color: 'bg-blue-500' },
              { key: 'parent', label: 'Parent support (Grey)', color: 'bg-slate-500' }
            ].map(f => (
              <label key={f.key} className="flex items-center space-x-2.5 cursor-pointer font-semibold py-0.5 text-slate-600 hover:text-slate-800">
                <input 
                  type="checkbox"
                  checked={activeFilters.includes(f.key)}
                  onChange={() => toggleFilter(f.key)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={`w-2 h-2 rounded-full ${f.color} shrink-0`}></span>
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Inspector Detail panel */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm text-xs flex-1 flex flex-col justify-between min-h-[220px]">
          <div>
            <h4 className="font-bold text-slate-800 flex items-center space-x-2 pb-2.5 border-b border-slate-100">
              <Info className="w-4 h-4 text-emerald-500" />
              <span>Entity Inspector</span>
            </h4>

            {selectedNode ? (
              <div className="mt-3.5 space-y-3">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Node Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedNode.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Ecosystem Role</span>
                  <span className="font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block text-[9px] mt-1">
                    {selectedNode.type === 'corp' ? 'Main Twin HQ' : selectedNode.type}
                  </span>
                </div>
                {selectedNode.description && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Scope Info</span>
                    <p className="text-[11px] text-slate-600 mt-1 italic font-medium leading-relaxed">&ldquo;{selectedNode.description}&rdquo;</p>
                  </div>
                )}
                {selectedNode.risk && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Audit Risk Index</span>
                    <span className="font-extrabold font-mono mt-1 block text-red-500">{selectedNode.risk}% Exposure</span>
                  </div>
                )}
              </div>
            ) : selectedLink ? (
              <div className="mt-3.5 space-y-3">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Relationship Description</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedLink.relation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Relationship Type</span>
                  <span className="font-bold text-teal-600 uppercase tracking-wide bg-teal-50 px-2 py-0.5 rounded border border-teal-100 inline-block text-[9px] mt-1">
                    {selectedLink.type}
                  </span>
                </div>
                {selectedLink.value && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Annual Volume Value</span>
                    <span className="font-extrabold text-slate-900 font-mono text-sm block mt-1">{selectedLink.value}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 h-32 mt-4">
                <Share2 className="w-8 h-8 text-slate-300 animate-pulse mb-2" />
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Click any node or relationship link on the graph to inspect detailed properties.</p>
              </div>
            )}
          </div>

          <button 
            onClick={handleReset} 
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition shadow-xs mt-4"
          >
            Reset Graph State
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay: Filters */}
      {showMobileFilters && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[1000] xl:hidden flex items-end justify-center animate-in fade-in duration-200"
          onClick={() => setShowMobileFilters(false)}
        >
          <div 
            className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
              paddingLeft: 'calc(1.25rem + env(safe-area-inset-left, 0px))',
              paddingRight: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Filter className="w-4 h-4 text-emerald-500" />
                <span>Interactive Filters</span>
              </span>
              <button className="text-slate-400 hover:text-slate-600 font-extrabold p-1.5 text-xs cursor-pointer" onClick={() => setShowMobileFilters(false)}>✕</button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder="Search graph nodes..."
                value={nodeSearchQuery}
                onChange={(e) => setNodeSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'partner', label: 'Partners (Teal)', color: 'bg-teal-500' },
                { key: 'competitor', label: 'Competitors (Orange)', color: 'bg-amber-500' },
                { key: 'supplier', label: 'Suppliers (Indigo)', color: 'bg-indigo-500' },
                { key: 'subsidiary', label: 'Subsidiaries (Blue)', color: 'bg-blue-500' },
                { key: 'parent', label: 'Parent support (Grey)', color: 'bg-slate-500' }
              ].map(f => (
                <label key={f.key} className="flex items-center space-x-3 cursor-pointer font-semibold py-1.5 text-slate-600 hover:text-slate-800 text-xs">
                  <input 
                    type="checkbox"
                    checked={activeFilters.includes(f.key)}
                    onChange={() => toggleFilter(f.key)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 w-4 h-4 cursor-pointer"
                  />
                  <span className={`w-2.5 h-2.5 rounded-full ${f.color} shrink-0`}></span>
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
            
            <button 
              onClick={() => { handleReset(); setShowMobileFilters(false); }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay: Entity Inspector */}
      {showMobileInspector && (selectedNode || selectedLink) && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[1000] xl:hidden flex items-end justify-center animate-in fade-in duration-200"
          onClick={() => setShowMobileInspector(false)}
        >
          <div 
            className="bg-white w-full rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
              paddingLeft: 'calc(1.25rem + env(safe-area-inset-left, 0px))',
              paddingRight: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Info className="w-4 h-4 text-emerald-500" />
                <span>Entity Inspector</span>
              </span>
              <button className="text-slate-400 hover:text-slate-600 font-extrabold p-1.5 text-xs cursor-pointer" onClick={() => setShowMobileInspector(false)}>✕</button>
            </div>

            {selectedNode ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Node Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedNode.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Ecosystem Role</span>
                  <span className="font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block text-[9px] mt-1">
                    {selectedNode.type === 'corp' ? 'Main Twin HQ' : selectedNode.type}
                  </span>
                </div>
                {selectedNode.description && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Scope Info</span>
                    <p className="text-[11px] text-slate-600 mt-1 italic font-medium leading-relaxed">&ldquo;{selectedNode.description}&rdquo;</p>
                  </div>
                )}
                {selectedNode.risk && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Audit Risk Index</span>
                    <span className="font-extrabold font-mono mt-1 block text-red-500">{selectedNode.risk}% Exposure</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Relationship Description</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedLink.relation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Relationship Type</span>
                  <span className="font-bold text-teal-600 uppercase tracking-wide bg-teal-50 px-2 py-0.5 rounded border border-teal-100 inline-block text-[9px] mt-1">
                    {selectedLink.type}
                  </span>
                </div>
                {selectedLink.value && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Annual Volume Value</span>
                    <span className="font-extrabold text-slate-900 font-mono text-sm block mt-1">{selectedLink.value}</span>
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={() => setShowMobileInspector(false)}
              className="w-full bg-slate-900 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition mt-4 cursor-pointer"
            >
              Dismiss Inspector
            </button>
          </div>
        </div>
      )}

      {/* Mobile Legend Bottom Sheet Overlay */}
      {(layoutMode === 'mobile' || layoutMode === 'tablet') && showLegend && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[1000] xl:hidden animate-in fade-in duration-200"
            onClick={() => setShowLegend(false)}
          />
          {/* Bottom Sheet */}
          <div 
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-slate-200 p-5 z-[1001] xl:hidden animate-in slide-in-from-bottom duration-300 shadow-2xl max-h-[50vh] overflow-y-auto"
            style={{
              paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
              paddingLeft: 'calc(1.25rem + env(safe-area-inset-left, 0px))',
              paddingRight: 'calc(1.25rem + env(safe-area-inset-right, 0px))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle indicator */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            
            <div className="flex justify-between items-center mb-3">
              <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider font-mono">Relationship Legend</span>
              <button 
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-600 font-semibold py-2">
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                <span>Main Twin (HQ)</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-teal-500 inline-block shrink-0"></span>
                <span>Partners (Teal)</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0"></span>
                <span>Competitors</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block shrink-0"></span>
                <span>Suppliers</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shrink-0"></span>
                <span>Subsidiaries</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-slate-500 inline-block shrink-0"></span>
                <span>Parent Co</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
