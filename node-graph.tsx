import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Node } from '@shared/schema';

interface NodeGraphVisualizerProps {
  currentNode: Node;
  linkedNodes: Node[];
  onNodeClick?: (nodeId: number) => void;
  className?: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number;
  title: string;
  nodeType: string;
  isCurrent?: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode;
  target: GraphNode;
}

export default function NodeGraphVisualizer({ 
  currentNode, 
  linkedNodes, 
  onNodeClick,
  className = "" 
}: NodeGraphVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  const getNodeColor = (nodeType: string, isCurrent: boolean = false) => {
    if (isCurrent) return '#2563eb'; // Blue for current node
    switch (nodeType) {
      case 'journal': return '#3b82f6';
      case 'document': return '#475569';
      case 'task': return '#64748b';
      case 'notification': return '#1e40af';
      case 'meeting': return '#334155';
      case 'note': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const getNodeInitial = (nodeType: string) => {
    switch (nodeType) {
      case 'journal': return 'J';
      case 'document': return 'D';
      case 'task': return 'T';
      case 'notification': return 'N';
      default: return '•';
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    // Prepare data
    const nodes: GraphNode[] = [
      { 
        id: currentNode.id, 
        title: currentNode.title, 
        nodeType: currentNode.nodeType,
        isCurrent: true 
      },
      ...linkedNodes.map(node => ({ 
        id: node.id, 
        title: node.title, 
        nodeType: node.nodeType,
        isCurrent: false 
      }))
    ];

    const links: GraphLink[] = linkedNodes.map(node => ({
      source: nodes.find(n => n.id === currentNode.id)!,
      target: nodes.find(n => n.id === node.id)!
    }));

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = dimensions.width;
    const height = dimensions.height;

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id.toString()).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35));

    // Create links
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8);

    // Create node groups
    const node = svg.append("g")
      .selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles
    node.append("circle")
      .attr("r", d => d.isCurrent ? 25 : 20)
      .attr("fill", d => getNodeColor(d.nodeType, d.isCurrent))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2);

    // Add text labels (initials)
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-size", d => d.isCurrent ? "14px" : "12px")
      .attr("font-weight", "bold")
      .text(d => getNodeInitial(d.nodeType));

    // Add title labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => d.isCurrent ? "45px" : "35px")
      .attr("fill", "#374151")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + "..." : d.title);

    // Add click handlers
    node.on("click", (event, d) => {
      if (!d.isCurrent && onNodeClick) {
        onNodeClick(d.id);
      }
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [currentNode, linkedNodes, dimensions, onNodeClick]);

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          setDimensions({ width: rect.width, height: Math.max(300, rect.height) });
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`w-full h-full min-h-[300px] ${className}`}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}