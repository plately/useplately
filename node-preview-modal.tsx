import { useRef, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import * as d3 from 'd3';

interface GraphNode {
  id: number;
  label: string;
  nodeType: string;
  radius: number;
  color: string;
}

interface GraphLink {
  source: number;
  target: number;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NodeGraphProps {
  data: GraphData;
  zoom?: number;
  onNodeSelect?: (nodeId: number) => void;
  onNodeLink?: (sourceId: number, targetId: number) => void;
  allowLinking?: boolean;
}

export default function NodeGraph({ data, zoom = 1, onNodeSelect, onNodeLink, allowLinking = false }: NodeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create node link mutation
  const createLinkMutation = useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: number; targetId: number }) => {
      return await apiRequest(`/api/nodes/${sourceId}/links`, {
        method: 'POST',
        body: JSON.stringify({ targetId }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      toast({
        title: "Nodes linked",
        description: "Connection created successfully"
      });
      setSelectedNode(null);
      setIsLinking(false);
    },
    onError: () => {
      toast({
        title: "Link failed",
        description: "Could not create node connection",
        variant: "destructive"
      });
      setIsLinking(false);
    }
  });
  
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Get dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create SVG
    const svg = d3.select(svgRef.current);
    
    // Apply zoom
    svg.attr("viewBox", `0 0 ${width} ${height}`)
       .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Create a gradient definitions
    const defs = svg.append("defs");
    
    // Add pulse animation for nodes
    const pulseAnimation = defs
      .append("filter")
      .attr("id", "pulse-animation")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    // Create feGaussianBlur filter
    pulseAnimation
      .append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", "1")
      .attr("result", "blur");
    
    // Add gradient for links
    const linkGradient = defs
      .append("linearGradient")
      .attr("id", "link-gradient")
      .attr("gradientUnits", "userSpaceOnUse");
      
    linkGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--primary)")
      .attr("stop-opacity", 0.6);
      
    linkGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--muted)")
      .attr("stop-opacity", 0.2);
    
    // Process links data to use IDs instead of objects
    const links = data.links.map(link => ({
      ...link,
      source: typeof link.source === 'object' ? (link.source as any).id : link.source,
      target: typeof link.target === 'object' ? (link.target as any).id : link.target
    }));
    
    // Create force simulation with better stability and control
    const simulation = d3.forceSimulation(data.nodes as any)
      // Link force with improved distance calculation
      .force("link", d3.forceLink(links)
        .id((d: any) => d.id)
        .distance((d: any) => {
          // Base link distance on node types - keep important nodes (journal, document) more central
          const sourceType = (d.source as any).nodeType;
          const targetType = (d.target as any).nodeType;
          
          if (sourceType === 'journal' || targetType === 'journal') {
            return 100; // Keep journal nodes closer to their connections
          }
          return 150; // Default link distance
        })
        .strength(0.5) // Reduce link strength for less chaotic movement
      )
      // Better charge with distance max to prevent excessive repulsion
      .force("charge", d3.forceManyBody()
        .strength(-400) // Stronger repulsion
        .distanceMax(300) // Limit the range of repulsion
        .theta(0.8) // Performance optimization
      )
      // Keep nodes centered
      .force("center", d3.forceCenter(centerX, centerY).strength(0.05))
      // Prevent node overlap with stronger collision detection
      .force("collide", d3.forceCollide()
        .radius((d: any) => d.radius * 2) // More spacing between nodes
        .strength(0.7) // Make collision detection stronger
        .iterations(2) // More iterations for better collision resolution
      )
      // Add x and y positioning forces for grid-like structure
      .force("x", d3.forceX(centerX).strength(0.03))
      .force("y", d3.forceY(centerY).strength(0.03));
    
    // Create container group with transform
    const g = svg.append("g")
      .attr("transform", `scale(${zoom})`);
    
    // Add grid background (subtle)
    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "var(--background)")
      .attr("opacity", 0.1);
    
    // Draw connection paths more elegantly with curves
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("stroke", "url(#link-gradient)")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.max(1, d.value * 0.5))
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)");
    
    // Create a pulsing glow effect for nodes
    const glows = g.append("g")
      .attr("class", "node-glows")
      .selectAll("circle")
      .data(data.nodes.filter(d => d.nodeType === "journal")) // Only add glow to journal nodes
      .enter()
      .append("circle")
      .attr("r", d => d.radius * 1.6)
      .attr("fill", d => d.color)
      .attr("opacity", 0.15)
      .attr("filter", "url(#pulse-animation)");
      
    // Create nodes with improved styling
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        // Prevent event propagation
        event.stopPropagation();
        
        // Call the callback if provided
        if (onNodeSelect) {
          onNodeSelect(d.id);
        }
      });
    
    // Add the main node circle  
    node.append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 1.5)
      // Add tooltips using title
      .append("title")
      .text((d) => `${d.label} (${d.nodeType})`);
      
    // Add a small icon or indicator based on node type
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("fill", "white")
      .attr("font-family", "sans-serif")
      .attr("font-size", (d) => d.radius * 0.8)
      .text((d) => {
        // Show first letter of the node type as an icon
        return d.nodeType.charAt(0).toUpperCase();
      });
    
    // Add labels with improved positioning and styling
    const labels = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .enter()
      .append("text")
      .text((d) => d.label)
      .attr("font-size", (d) => d.nodeType === "journal" ? 11 : 9)
      .attr("font-weight", (d) => d.nodeType === "journal" ? "bold" : "normal")
      .attr("dx", (d) => d.radius + 5)
      .attr("dy", 4)
      .attr("fill", "var(--foreground)")
      .attr("pointer-events", "none")
      .attr("opacity", (d) => d.nodeType === "journal" ? 1 : 0.8);
    
    // Improved drag behavior to keep nodes where we place them
    const dragStarted = (event: any, d: any) => {
      // Set a lower alpha target for smoother movement during drag
      if (!event.active) simulation.alphaTarget(0.2).restart();
      
      // Save the current position as fixed position
      d.fx = d.x;
      d.fy = d.y;
      
      // Add a visual indication that node is being dragged
      d3.select(event.sourceEvent.target).classed("dragging", true);
    };
    
    const dragged = (event: any, d: any) => {
      // Update the fixed position
      d.fx = event.x;
      d.fy = event.y;
      
      // Constrain to boundaries
      d.fx = Math.max(d.radius, Math.min(width - d.radius, d.fx));
      d.fy = Math.max(d.radius, Math.min(height - d.radius, d.fy));
    };
    
    const dragEnded = (event: any, d: any) => {
      // Cool down the simulation
      if (!event.active) simulation.alphaTarget(0);
      
      // IMPORTANT: Keep nodes fixed where user placed them 
      // instead of releasing them back to simulation
      // (this makes the graph more stable)
      // d.fx = null;
      // d.fy = null;
      
      // Remove visual indication
      d3.select(event.sourceEvent.target).classed("dragging", false);
      
      // Setting fx and fy through drag is now permanent
    };
    
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded);
    
    // Apply drag behavior to nodes
    node.call(drag as any);
    
    // Update positions on tick
    simulation.on("tick", () => {
      // Update link paths (using curved paths)
      link.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2;
        
        return `M${d.source.x},${d.source.y} A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });
      
      // Update node positions with bounds checking
      node.attr("transform", (d: any) => {
        const x = Math.max(d.radius, Math.min(width - d.radius, d.x)); 
        const y = Math.max(d.radius, Math.min(height - d.radius, d.y));
        return `translate(${x}, ${y})`;
      });
      
      // Update glow positions
      glows.attr("cx", (d: any) => Math.max(d.radius, Math.min(width - d.radius, d.x)))
           .attr("cy", (d: any) => Math.max(d.radius, Math.min(height - d.radius, d.y)));
      
      // Update label positions
      labels
        .attr("x", (d: any) => Math.max(d.radius, Math.min(width - d.radius, d.x)))
        .attr("y", (d: any) => Math.max(d.radius, Math.min(height - d.radius, d.y)));
    });
    
    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [data, zoom, onNodeSelect]);
  
  return (
    <svg 
      ref={svgRef} 
      className="w-full h-full"
      viewBox={`0 0 ${svgRef.current?.clientWidth || 800} ${svgRef.current?.clientHeight || 600}`}
    />
  );
}
