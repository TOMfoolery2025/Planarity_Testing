import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import ForceGraph3D from 'react-force-graph-3d';

interface Node {
    id: number | string
    x: number
    y: number
    fx?: number | null
    fy?: number | null
    label?: string
}

interface Link {
    source: number | string | Node
    target: number | string | Node
    is_conflict?: boolean
    id?: string
}

interface GraphVizProps {
    nodes: Node[]
    edges: Link[]
    width?: number
    height?: number
}

// CPK Coloring for common elements
const CPK_COLORS: Record<string, string> = {
    'H': '#FFFFFF', // Hydrogen - White
    'C': '#909090', // Carbon - Gray
    'N': '#3050F8', // Nitrogen - Blue
    'O': '#FF0D0D', // Oxygen - Red
    'F': '#90E050', // Fluorine - Green
    'Cl': '#1FF01F', // Chlorine - Green
    'Br': '#A62929', // Bromine - Dark Red
    'I': '#940094', // Iodine - Violet
    'S': '#FFFF30', // Sulfur - Yellow
    'P': '#FF8000', // Phosphorus - Orange
};

const GraphViz: React.FC<GraphVizProps> = ({ nodes: initialNodes, edges: initialEdges }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Identify conflict edges
    const conflictEdges = initialEdges.filter(e => e.is_conflict).map(e => {
        // Create a unique ID for the edge if not present, or use source-target
        // Note: The backend doesn't send edge IDs, so we rely on the is_conflict flag directly on the edge object.
        // But for D3 join, we might need stable IDs.
        return `${e.source}-${e.target}`;
    });

    const isPlanar = conflictEdges.length === 0;

    // Update dimensions on mount and resize
    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    }, []);

    // --- 2D D3 Logic (Only for Planar) ---
    useEffect(() => {
        if (!isPlanar || !svgRef.current || !containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Clear previous
        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3.select(svgRef.current)
            .attr("viewBox", [0, 0, width, height]);

        // Group for zoom
        const g = svg.append("g");

        // Zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 10])
            .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                g.attr("transform", event.transform.toString());
                setZoomLevel(event.transform.k);
            });

        svg.call(zoom);

        // Deep copy data for D3 mutation
        const nodes: Node[] = initialNodes.map(d => ({
            ...d,
            // Use backend coordinates if available, otherwise random
            x: d.x ?? Math.random() * width,
            y: d.y ?? Math.random() * height
        }));

        const links: Link[] = initialEdges.map(d => ({ ...d }));

        // Simulation Setup
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(15).iterations(2));

        // Render Links
        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", (d) => d.is_conflict ? 3 : 1.5)
            .attr("stroke", (d) => d.is_conflict ? "#ef4444" : "#64748b")
            .attr("opacity", 0.6)
            .attr("class", (d) => d.is_conflict ? "animate-pulse" : "");

        // Render Nodes
        const node = g.append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 8)
            .attr("fill", (d) => {
                // Check if node is part of a conflict edge
                const isBad = links.some(l =>
                    l.is_conflict &&
                    ((typeof l.source === 'object' ? (l.source as Node).id : l.source) === d.id ||
                        (typeof l.target === 'object' ? (l.target as Node).id : l.target) === d.id)
                );

                if (isBad) return "#f87171"; // Light Red

                // CPK Coloring
                if (d.label && CPK_COLORS[d.label]) {
                    return CPK_COLORS[d.label];
                }

                return "#10b981"; // Planar Green (Default)
            })
            .attr("stroke", "#1e293b")
            .attr("stroke-width", 1.5)
            .call(d3.drag<SVGCircleElement, Node>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended) as any);

        // Render Labels
        if (nodes.length < 100) {
            const text = g.append("g")
                .selectAll("text")
                .data(nodes)
                .join("text")
                .text(d => d.label || String(d.id))
                .attr("font-size", 10)
                .attr("fill", "#cbd5e1")
                .attr("dx", 10)
                .attr("dy", 3)
                .style("pointer-events", "none")
                .style("user-select", "none");

            simulation.on("tick", () => {
                link
                    .attr("x1", (d: any) => d.source.x)
                    .attr("y1", (d: any) => d.source.y)
                    .attr("x2", (d: any) => d.target.x)
                    .attr("y2", (d: any) => d.target.y);

                node
                    .attr("cx", (d: any) => d.x)
                    .attr("cy", (d: any) => d.y);

                text
                    .attr("x", (d: any) => d.x)
                    .attr("y", (d: any) => d.y);
            });
        } else {
            simulation.on("tick", () => {
                link
                    .attr("x1", (d: any) => d.source.x)
                    .attr("y1", (d: any) => d.source.y)
                    .attr("x2", (d: any) => d.target.x)
                    .attr("y2", (d: any) => d.target.y);

                node
                    .attr("cx", (d: any) => d.x)
                    .attr("cy", (d: any) => d.y);
            });
        }

        // Drag functions
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
    }, [initialNodes, initialEdges, isPlanar, dimensions]);

    // --- 3D Render for Non-Planar Graphs ---
    if (!isPlanar) {
        // Prepare data for ForceGraph3D
        // Fix: Ensure fx/fy are undefined, not null, to satisfy ForceGraph3D types
        const graphData = {
            nodes: initialNodes.map(n => ({
                ...n,
                fx: n.fx ?? undefined,
                fy: n.fy ?? undefined
            })),
            links: initialEdges.map(e => ({ ...e }))
        };

        return (
            <div ref={containerRef} className="viz-container" style={{ background: '#000000' }}>
                <ForceGraph3D
                    graphData={graphData as any}
                    width={dimensions.width}
                    height={dimensions.height}
                    backgroundColor="#000000"
                    nodeLabel="label"
                    nodeColor={(node: any) => {
                        if (node.label && CPK_COLORS[node.label]) {
                            return CPK_COLORS[node.label];
                        }
                        return "#3b82f6"; // Blue (to contrast with red edges)
                    }}
                    nodeRelSize={6}
                    linkColor={(link: any) => link.is_conflict ? "#ef4444" : "#64748b"}
                    linkWidth={(link: any) => link.is_conflict ? 3 : 1}
                    linkOpacity={(link: any) => link.is_conflict ? 1 : 0.3}
                />

                {/* 3D Overlay */}
                <div className="viz-overlay-top-left">
                    <div className="viz-stat-badge">
                        3D Mode (Non-Planar)
                    </div>
                    <div className="viz-stat-badge">
                        Nodes: {initialNodes.length}
                    </div>
                </div>

                <div className="viz-overlay-bottom-right">
                    <div className="legend-item">
                        <span className="legend-dot bg-blue"></span> Node
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot bg-red animate-pulse"></span> Conflict Edge
                    </div>
                    {initialNodes.some(n => n.label === 'O') && (
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: '#FF0D0D' }}></span> Oxygen
                        </div>
                    )}
                    {initialNodes.some(n => n.label === 'N') && (
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: '#3050F8' }}></span> Nitrogen
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- 2D Render for Planar Graphs ---
    return (
        <div ref={containerRef} className="viz-container">
            <svg ref={svgRef} className="cursor-move" style={{ width: '100%', height: '100%' }}></svg>

            {/* Stats Overlay */}
            <div className="viz-overlay-top-left">
                <div className="viz-stat-badge">
                    2D Mode (Planar)
                </div>
                <div className="viz-stat-badge">
                    Nodes: {initialNodes.length}
                </div>
                <div className="viz-stat-badge">
                    Edges: {initialEdges.length}
                </div>
                <div className="viz-stat-badge">
                    Zoom: {zoomLevel.toFixed(1)}x
                </div>
            </div>

            {/* Legend Overlay */}
            <div className="viz-overlay-bottom-right">
                {initialNodes.some(n => n.label === 'C') && (
                    <div className="legend-item">
                        <span className="legend-dot" style={{ background: '#909090' }}></span> Carbon
                    </div>
                )}
                {initialNodes.some(n => n.label === 'O') && (
                    <div className="legend-item">
                        <span className="legend-dot" style={{ background: '#FF0D0D' }}></span> Oxygen
                    </div>
                )}
                {initialNodes.some(n => n.label === 'N') && (
                    <div className="legend-item">
                        <span className="legend-dot" style={{ background: '#3050F8' }}></span> Nitrogen
                    </div>
                )}
            </div>
        </div>
    );
};

export default GraphViz;
