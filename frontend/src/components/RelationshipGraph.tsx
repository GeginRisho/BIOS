'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Share2, Info, Search, Filter } from 'lucide-react';

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
}

export default function RelationshipGraph({ businessName }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);

  // Active filters toggles
  const [activeFilters, setActiveFilters] = useState<string[]>([
    'partner', 'competitor', 'supplier', 'subsidiary', 'parent'
  ]);

  // Selected & Hovered state inspector values
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");

  // Legend config with specified color standards
  const relationshipColors: Record<string, string> = {
    corp: '#EF4444',        // Red for Selected Center
    partner: '#10B981',     // Green for Partners
    competitor: '#F97316',  // Orange for Competitors
    supplier: '#8B5CF6',    // Purple for Suppliers
    subsidiary: '#3B82F6',  // Blue for Subsidiaries
    parent: '#94A3B8'       // Grey for Parent Company
  };

  // Generate dataset based on Selected Business Name
  const getGraphData = () => {
    const nameLower = businessName?.toLowerCase() || "";
    let rawNodes: Node[] = [
      { id: "center", name: businessName, type: "corp", description: "Audited Center Corporate Twin Profile", risk: 8, valueSize: 32 },
    ];
    let rawLinks: Link[] = [];

    if (nameLower.includes("apple")) {
      rawNodes.push(
        { id: "dhl", name: "DHL Supply Chain", type: "partner", description: "Global warehouse and express parcel partner.", risk: 10, valueSize: 22 },
        { id: "infosys", name: "Infosys Ltd.", type: "partner", description: "IT consulting and system integration partner.", risk: 12, valueSize: 22 },
        { id: "foxconn", name: "Foxconn Shenzhen", type: "partner", description: "Assembly gigafactory partner.", risk: 25, valueSize: 22 },
        { id: "google", name: "Google LLC", type: "competitor", description: "Rival in smartphone OS and search engines.", risk: 8, valueSize: 22 },
        { id: "microsoft", name: "Microsoft Corporation", type: "competitor", description: "Rival in productivity tools, cloud, and AI.", risk: 6, valueSize: 22 },
        { id: "samsung", name: "Samsung Electronics", type: "competitor", description: "Rival in mobile screens, memory, and devices.", risk: 11, valueSize: 22 },
        { id: "tsmc", name: "TSMC Co.", type: "supplier", description: "Foundry supplier of neural microchips.", risk: 18, valueSize: 22 },
        { id: "sino", name: "Sino Logistics", type: "supplier", description: "Cargo container sea freight supplier.", risk: 16, valueSize: 22 },
        { id: "london_office", name: "Apple London Office", type: "subsidiary", description: "Regional headquarters handling EU markets.", risk: 4, valueSize: 20 },
        { id: "germany_office", name: "Apple Germany GmbH", type: "subsidiary", description: "European sales subsidiary.", risk: 5, valueSize: 20 },
        { id: "berkshire", name: "Berkshire Hathaway", type: "parent", description: "Major institutional shareowner and parent backer.", risk: 3, valueSize: 24 }
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
        { id: "panasonic", name: "Panasonic Energy", type: "partner", description: "Joint lithium cell production partner.", risk: 14, valueSize: 22 },
        { id: "google", name: "Google LLC", type: "partner", description: "In-car map services partner.", risk: 7, valueSize: 22 },
        { id: "byd", name: "BYD Auto", type: "competitor", description: "Primary competitor in consumer electric cars.", risk: 20, valueSize: 22 },
        { id: "samsung", name: "Samsung Electronics", type: "competitor", description: "Competitor in autopilot chips packaging.", risk: 11, valueSize: 22 },
        { id: "nvidia", name: "NVIDIA Corp", type: "supplier", description: "Supplier of H100 AI neural compute grids.", risk: 9, valueSize: 22 },
        { id: "tsmc", name: "TSMC Co.", type: "supplier", description: "Foundry supplier for autopilot boards.", risk: 15, valueSize: 22 },
        { id: "berlin_gigafactory", name: "Gigafactory Berlin", type: "subsidiary", description: "European assembly subsidiary facility.", risk: 10, valueSize: 20 },
        { id: "musk_trust", name: "Musk Family Trust", type: "parent", description: "Core shareholder holding board control.", risk: 18, valueSize: 24 }
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
      // General corporate layout mapping
      rawNodes.push(
        { id: "dhl", name: "DHL Supply Chain", type: "partner", description: "Global express shipping partner.", risk: 8, valueSize: 22 },
        { id: "competitor_alpha", name: "Competitor Alpha", type: "competitor", description: "Rival in market share bid processes.", risk: 18, valueSize: 22 },
        { id: "sino", name: "Sino Logistics", type: "supplier", description: "Cargo container sea freight supplier.", risk: 15, valueSize: 22 },
        { id: "sub_office", name: "Regional Branch LLC", type: "subsidiary", description: "Customer success subsidiary.", risk: 4, valueSize: 20 },
        { id: "parent_corp", name: "Apex Parent Corp", type: "parent", description: "Holding company holding corporate stock.", risk: 6, valueSize: 24 }
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
  };

  const fullData = getGraphData();

  // Filter lists based on Search Query and Toggled Filter Types
  const filteredNodes = fullData.nodes.filter(n => {
    if (n.type === 'corp') return true;
    const matchesFilter = activeFilters.includes(n.type);
    const matchesSearch = nodeSearchQuery === "" || n.name.toLowerCase().includes(nodeSearchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredLinks = fullData.links.filter(l => {
    const srcId = typeof l.source === 'object' ? (l.source as Node).id : l.source;
    const tgtId = typeof l.target === 'object' ? (l.target as Node).id : l.target;
    const matchesFilter = activeFilters.includes(l.type);
    const nodesExist = filteredNodes.some(n => n.id === srcId) && filteredNodes.some(n => n.id === tgtId);
    return matchesFilter && nodesExist;
  });

  // Highlight reset button
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

  // Zoom helpers
  const handleZoom = (factor: number) => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy, factor);
    }
  };

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Re-run D3 Force Simulation whenever filters change
  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 450;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg.append("g");

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Setup arrow markers colored dynamically
    const defs = container.append("defs");
    Object.keys(relationshipColors).forEach((type) => {
      defs.append("marker")
        .attr("id", `marker-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 34) 
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", relationshipColors[type]);
    });

    // Shadow filters for professional depth
    const shadow = defs.append("filter")
      .attr("id", "node-shadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%");
    shadow.append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "3")
      .attr("stdDeviation", "4")
      .attr("flood-opacity", "0.08");

    // Force simulation configurations (increased collision and link distance to remove overlaps)
    const simulation = d3.forceSimulation<Node>(filteredNodes)
      .force("link", d3.forceLink<Node, Link>(filteredLinks).id((d) => d.id).distance(220))
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    // Draw lines
    const link = container.append("g")
      .selectAll("line")
      .data(filteredLinks)
      .enter().append("line")
      .attr("class", "animated-link cursor-pointer transition")
      .attr("stroke", (d) => relationshipColors[d.type] || "#94A3B8")
      .attr("stroke-width", 2.2)
      .attr("marker-end", (d) => `url(#marker-${d.type})`)
      .on("click", (event, d) => {
        setSelectedLink(d);
        setSelectedNode(null);
        event.stopPropagation();
      });

    // Draw edge labels as requested
    const linkLabel = container.append("g")
      .selectAll("g")
      .data(filteredLinks)
      .enter().append("g")
      .attr("class", "edge-label cursor-pointer");

    // Background rect to prevent text overlapping line
    linkLabel.append("rect")
      .attr("fill", "#F8FAFC")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("height", 14)
      .attr("width", (d) => d.relation.length * 5 + 10)
      .attr("stroke", "#CBD5E1")
      .attr("stroke-width", 0.5);

    linkLabel.append("text")
      .attr("font-size", "7.5px")
      .attr("font-weight", "700")
      .attr("fill", "#475569")
      .attr("text-anchor", "middle")
      .attr("dy", "9.5")
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
      .attr("filter", "url(#node-shadow)")
      .attr("class", "cursor-pointer");

    // Draw Node circles
    node.append("circle")
      .attr("r", (d) => d.valueSize ?? 22)
      .attr("fill", (d) => (d.type === "corp" ? "#EF4444" : "#FFFFFF"))
      .attr("stroke", (d) => relationshipColors[d.type] || "#64748B")
      .attr("stroke-width", 3)
      .on("click", (event, d) => {
        setSelectedNode(d);
        setSelectedLink(null);
        event.stopPropagation();
      });

    // Initials symbol
    node.append("text")
      .attr("dy", "3")
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-weight", "extrabold")
      .attr("fill", (d) => (d.type === "corp" ? "#FFFFFF" : "#1E293B"))
      .attr("class", "select-none pointer-events-none")
      .text((d) => {
        if (d.type === "corp") return "HQ";
        if (d.type === "partner") return "PTNR";
        if (d.type === "competitor") return "COMP";
        if (d.type === "supplier") return "SUPP";
        if (d.type === "subsidiary") return "SUB";
        return "PRNT";
      });

    // Label names below nodes
    node.append("text")
      .attr("dy", (d) => (d.valueSize ?? 22) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "800")
      .attr("fill", "#0F172A")
      .attr("class", "select-none pointer-events-none")
      .text((d) => d.name);

    // Tick layout loop
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x || 0)
        .attr("y1", (d) => (d.source as Node).y || 0)
        .attr("x2", (d) => (d.target as Node).x || 0)
        .attr("y2", (d) => (d.target as Node).y || 0);

      node.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);

      linkLabel.attr("transform", (d) => {
        const x1 = (d.source as Node).x || 0;
        const y1 = (d.source as Node).y || 0;
        const x2 = (d.target as Node).x || 0;
        const y2 = (d.target as Node).y || 0;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const width = d.relation.length * 5 + 10;
        return `translate(${midX - width / 2}, ${midY - 7})`;
      });
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
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
    };
  }, [filteredNodes, filteredLinks]);

  // Count nodes by type for top panel metrics
  const partnersCount = fullData.nodes.filter(n => n.type === 'partner').length;
  const competitorsCount = fullData.nodes.filter(n => n.type === 'competitor').length;
  const suppliersCount = fullData.nodes.filter(n => n.type === 'supplier').length;
  const subsidiariesCount = fullData.nodes.filter(n => n.type === 'subsidiary').length;
  const parentCount = fullData.nodes.filter(n => n.type === 'parent').length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <style>{`
        @keyframes flow-dash {
          to { stroke-dashoffset: -24; }
        }
        .animated-link {
          stroke-dasharray: 6, 4;
          animation: flow-dash 1.8s infinite linear;
        }
      `}</style>

      {/* TOP INFORMATION SUMMARY PANEL */}
      <div className="col-span-4 bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm grid grid-cols-2 md:grid-cols-6 gap-4 text-center select-none">
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Selected Twin</span>
          <span className="text-xs font-extrabold text-red-500 truncate block mt-1">{businessName}</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Partners</span>
          <span className="text-sm font-extrabold text-emerald-600 block mt-1">{partnersCount} Linked</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Competitors</span>
          <span className="text-sm font-extrabold text-orange-500 block mt-1">{competitorsCount} Rivals</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Suppliers</span>
          <span className="text-sm font-extrabold text-purple-600 block mt-1">{suppliersCount} Foundries</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Subsidiaries</span>
          <span className="text-sm font-extrabold text-blue-500 block mt-1">{subsidiariesCount} Offices</span>
        </div>
        <div className="border-r border-slate-100 last:border-0 p-2">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Parent Support</span>
          <span className="text-sm font-extrabold text-slate-500 block mt-1">{parentCount} Holding</span>
        </div>
      </div>

      {/* GRAPH CANVAS & CONTROLS PANEL (3 Cols) */}
      <div className="xl:col-span-3 flex flex-col space-y-4">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-50 relative h-[450px] shadow-inner overflow-hidden">
          <svg ref={svgRef} className="w-full h-full" />

          {/* Floating Canvas Controls */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200/80 p-1.5 rounded-xl shadow-md flex space-x-1">
            <button 
              onClick={() => handleZoom(1.2)} 
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition" 
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleZoom(0.8)} 
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition" 
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button 
              onClick={handleReset} 
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition" 
              title="Reset Layout"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Inline Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-md text-[9px] pointer-events-none select-none max-w-xs space-y-1">
            <span className="font-bold text-slate-400 uppercase tracking-wider block font-mono">Legend</span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600 font-semibold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span>Selected (Red)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Partners (Green)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                <span>Competitors (Orange)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                <span>Suppliers (Purple)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                <span>Subsidiaries (Blue)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                <span>Parent (Grey)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & DRILLDOWN DETAIL INSPECTOR (1 Col) */}
      <div className="xl:col-span-1 flex flex-col space-y-4">
        
        {/* Graph Filters Card */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm text-xs space-y-3">
          <h4 className="font-bold text-slate-800 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>Interactive Filters</span>
          </h4>

          {/* Search box inside filter panel */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search graph nodes..."
              value={nodeSearchQuery}
              onChange={(e) => setNodeSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-indigo-400 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            {[
              { key: 'partner', label: 'Partners (Green)', color: 'bg-emerald-500' },
              { key: 'competitor', label: 'Competitors (Orange)', color: 'bg-orange-500' },
              { key: 'supplier', label: 'Suppliers (Purple)', color: 'bg-purple-500' },
              { key: 'subsidiary', label: 'Subsidiaries (Blue)', color: 'bg-blue-500' },
              { key: 'parent', label: 'Parent Company (Grey)', color: 'bg-slate-400' }
            ].map(f => (
              <label key={f.key} className="flex items-center space-x-2.5 cursor-pointer font-semibold py-0.5 text-slate-600 hover:text-slate-800">
                <input 
                  type="checkbox"
                  checked={activeFilters.includes(f.key)}
                  onChange={() => toggleFilter(f.key)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-3.5 h-3.5"
                />
                <span className={`w-2 h-2 rounded-full ${f.color} shrink-0`}></span>
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Drilldown inspector details panel */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm text-xs flex-1 flex flex-col justify-between min-h-[220px]">
          <div>
            <h4 className="font-bold text-slate-800 flex items-center space-x-2 pb-2.5 border-b border-slate-100">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>Entity Inspector</span>
            </h4>

            {selectedNode ? (
              <div className="mt-3.5 space-y-3">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Node Name</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedNode.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Ecosystem Type</span>
                  <span className="font-bold text-indigo-600 uppercase tracking-wide bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block text-[9px] mt-0.5">
                    {selectedNode.type === 'corp' ? 'Main HQ' : selectedNode.type}
                  </span>
                </div>
                {selectedNode.description && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Profile Scope</span>
                    <p className="text-[11px] text-slate-600 mt-1 italic font-medium">&ldquo;{selectedNode.description}&rdquo;</p>
                  </div>
                )}
                {selectedNode.risk && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Audit Risk Index</span>
                    <span className="font-bold font-mono mt-0.5 block text-red-500">{selectedNode.risk}% Exposure</span>
                  </div>
                )}
              </div>
            ) : selectedLink ? (
              <div className="mt-3.5 space-y-3">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Relationship Description</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedLink.relation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Relationship Type</span>
                  <span className="font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block text-[9px] mt-0.5">
                    {selectedLink.type}
                  </span>
                </div>
                {selectedLink.value && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Annual Estimated Value</span>
                    <span className="font-extrabold text-slate-900 font-mono text-sm block mt-0.5">{selectedLink.value}</span>
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
    </div>
  );
}
