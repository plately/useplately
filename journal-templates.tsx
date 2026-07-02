import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { Node, NodeLink } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InteractiveNodeGraphRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomToNode: (nodeId: number) => void;
  lockZoom: () => void;
  unlockZoom: () => void;
  toggleLinkingMode: () => void;
}

interface InteractiveNodeGraphProps {
  nodes: Node[];
  links: NodeLink[];
  onNodeClick?: (nodeId: number) => void;
  className?: string;
  focusNodeId?: number | null;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: number;
  title: string;
  nodeType: string;
  radius: number;
  fill: string;
  light: string;
  icon: string;
  isCore: boolean;
  selected?: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: number;
  source: GraphNode;
  target: GraphNode;
  label?: string;
}

// ─── Node Configuration ───────────────────────────────────────────────────────

const NODE_CONFIG: Record<string, { fill: string; light: string; icon: string }> = {
  journal:  { fill: '#6366f1', light: '#a5b4fc', icon: '✦' },
  task:     { fill: '#10b981', light: '#6ee7b7', icon: '✓' },
  note:     { fill: '#f59e0b', light: '#fcd34d', icon: '≡' },
  meeting:  { fill: '#ef4444', light: '#fca5a5', icon: '◎' },
  chat:     { fill: '#3b82f6', light: '#93c5fd', icon: '◆' },
  idea:     { fill: '#a855f7', light: '#d8b4fe', icon: '★' },
  file:     { fill: '#ec4899', light: '#f9a8d4', icon: '▣' },
  link:     { fill: '#14b8a6', light: '#5eead4', icon: '⊞' },
  document: { fill: '#f97316', light: '#fdba74', icon: '◈' },
  default:  { fill: '#64748b', light: '#94a3b8', icon: '◉' },
};

const getCfg = (t: string) => NODE_CONFIG[t] ?? NODE_CONFIG.default;

const BASE_R = 20;
const CORE_R = 30;

// ─── Component ────────────────────────────────────────────────────────────────

const InteractiveNodeGraph = forwardRef<InteractiveNodeGraphRef, InteractiveNodeGraphProps>(({
  nodes,
  links,
  onNodeClick,
  className = '',
  focusNodeId = null,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const queryClient = useQueryClient();

  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });
  const [isLinkingMode, setIsLinkingMode] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkType, setLinkType] = useState('related');

  // Stable refs so D3 handlers can always read the latest values
  const zoomBehaviorRef   = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const graphNodesRef     = useRef<GraphNode[]>([]);
  const isZoomLockedRef   = useRef(false);
  // Persist node positions across data changes so the graph never "restarts"
  const nodePositionsRef  = useRef<Map<number, { x: number; y: number; fx?: number; fy?: number }>>(new Map());
  const isLinkingRef    = useRef(false);
  const selectedRef     = useRef<number[]>([]);
  const onClickRef      = useRef(onNodeClick);

  useEffect(() => { isLinkingRef.current = isLinkingMode; }, [isLinkingMode]);
  useEffect(() => { selectedRef.current  = selectedNodes;  }, [selectedNodes]);
  useEffect(() => { onClickRef.current   = onNodeClick;    }, [onNodeClick]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/node-links/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/node-links'] });
      toast({ title: 'Link removed' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Could not remove link' }),
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/nodes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/nodes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/node-links'] });
      toast({ title: 'Node deleted' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Could not delete node' }),
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { sourceId: number; targetId: number; label?: string; type?: string }) =>
      apiRequest('/api/node-links', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/node-links'] });
      setIsLinkDialogOpen(false);
      setLinkLabel('');
      setLinkType('related');
      setSelectedNodes([]);
      setIsLinkingMode(false);
      toast({ title: 'Nodes connected' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Could not create link' }),
  });

  const handleConfirmLink = useCallback(() => {
    if (selectedRef.current.length === 2) {
      createLinkMutation.mutate({
        sourceId: selectedRef.current[0],
        targetId: selectedRef.current[1],
        label: linkLabel,
        type: linkType,
      });
    }
  }, [linkLabel, linkType, createLinkMutation]);

  // ── Ref API ────────────────────────────────────────────────────────────────

  const toggleLinkingMode = useCallback(() => {
    setIsLinkingMode(p => !p);
    setSelectedNodes([]);
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn() {
      if (svgRef.current && zoomBehaviorRef.current && !isZoomLockedRef.current)
        d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.5);
    },
    zoomOut() {
      if (svgRef.current && zoomBehaviorRef.current && !isZoomLockedRef.current)
        d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.67);
    },
    resetZoom() {
      if (svgRef.current && zoomBehaviorRef.current && !isZoomLockedRef.current)
        d3.select(svgRef.current).transition().duration(600).call(zoomBehaviorRef.current.transform, d3.zoomIdentity.scale(0.75));
    },
    zoomToNode(nodeId: number) {
      const node = graphNodesRef.current.find(n => n.id === nodeId);
      if (!node || !svgRef.current || !zoomBehaviorRef.current) return;
      const { width, height } = dimensions;
      const scale = 1.4;
      const tx = width / 2 - (node.x ?? 0) * scale;
      const ty = height / 2 - (node.y ?? 0) * scale;
      d3.select(svgRef.current)
        .transition().duration(800).ease(d3.easeCubicInOut)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    },
    lockZoom() {
      isZoomLockedRef.current = true;
      if (svgRef.current) d3.select(svgRef.current).on('.zoom', null);
    },
    unlockZoom() {
      isZoomLockedRef.current = false;
      if (svgRef.current && zoomBehaviorRef.current)
        d3.select(svgRef.current).call(zoomBehaviorRef.current);
    },
    toggleLinkingMode,
  }), [toggleLinkingMode, dimensions]);

  // ── Resize observer ────────────────────────────────────────────────────────

  useEffect(() => {
    const measure = () => {
      if (!svgRef.current?.parentElement) return;
      const r = svgRef.current.parentElement.getBoundingClientRect();
      setDimensions({ width: Math.max(600, r.width), height: Math.max(500, r.height) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Highlight selected nodes (separate from main effect) ───────────────────

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll<SVGCircleElement, GraphNode>('.node-ring')
      .attr('opacity', d => selectedNodes.includes(d.id) ? 1 : 0)
      .attr('r',       d => d.radius + (selectedNodes.includes(d.id) ? 10 : 8));
  }, [selectedNodes]);

  // ── Main D3 graph build ────────────────────────────────────────────────────

  useEffect(() => {
    if (!svgRef.current || !nodes?.length) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ── SVG Defs ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs');

    // Dot-grid background pattern
    const pat = defs.append('pattern')
      .attr('id', 'dot-grid').attr('width', 28).attr('height', 28)
      .attr('patternUnits', 'userSpaceOnUse');
    pat.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 1.2)
      .attr('fill', 'rgba(255,255,255,0.05)');

    // Soft glow filter
    const fGlow = defs.append('filter').attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    fGlow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const glowMerge = fGlow.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'blur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow for core nodes
    const fCore = defs.append('filter').attr('id', 'core-glow')
      .attr('x', '-80%').attr('y', '-80%').attr('width', '360%').attr('height', '360%');
    fCore.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
    const coreMerge = fCore.append('feMerge');
    coreMerge.append('feMergeNode').attr('in', 'blur');
    coreMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Per-type radial gradients
    Object.entries(NODE_CONFIG).forEach(([type, cfg]) => {
      const grad = defs.append('radialGradient')
        .attr('id', `grad-${type}`)
        .attr('cx', '35%').attr('cy', '35%').attr('r', '65%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', cfg.light).attr('stop-opacity', '0.85');
      grad.append('stop').attr('offset', '100%').attr('stop-color', cfg.fill).attr('stop-opacity', '1');
    });

    // ── Background ────────────────────────────────────────────────────────────
    svg.append('rect').attr('width', width).attr('height', height)
      .attr('fill', 'url(#dot-grid)');

    // ── Main zoomable group ───────────────────────────────────────────────────
    const g = svg.append('g').attr('class', 'main-group');

    // ── Prepare data ──────────────────────────────────────────────────────────
    const graphNodes: GraphNode[] = nodes.map((n, i) => {
      const cfg = getCfg(n.nodeType);
      const isCore = n.isCore ?? false;
      const r = isCore ? CORE_R : BASE_R;
      // Restore pinned position if we've seen this node before
      const saved = nodePositionsRef.current.get(n.id);
      const angle = (i / nodes.length) * 2 * Math.PI;
      const spread = Math.min(width, height) * 0.3;
      return {
        id: n.id,
        title: n.title,
        nodeType: n.nodeType,
        radius: r,
        fill: cfg.fill,
        light: cfg.light,
        icon: cfg.icon,
        isCore,
        selected: false,
        x: saved?.x ?? width / 2 + Math.cos(angle) * spread * (0.5 + Math.random() * 0.5),
        y: saved?.y ?? height / 2 + Math.sin(angle) * spread * (0.5 + Math.random() * 0.5),
        fx: saved?.fx,
        fy: saved?.fy,
      };
    });

    const graphLinks: GraphLink[] = (links ?? []).map(l => {
      const src = graphNodes.find(n => n.id === l.sourceId);
      const tgt = graphNodes.find(n => n.id === l.targetId);
      if (!src || !tgt) return null;
      return { id: l.id, source: src, target: tgt, label: l.label };
    }).filter(Boolean) as GraphLink[];

    graphNodesRef.current = graphNodes;

    // ── Force simulation ───────────────────────────────────────────────────────
    const sim = d3.forceSimulation<GraphNode>(graphNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphLinks)
        .id(d => d.id.toString()).distance(140).strength(0.25))
      .force('charge', d3.forceManyBody<GraphNode>().strength(-500))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => d.radius + 28).strength(0.9))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.06))
      .velocityDecay(0.55)
      .alphaDecay(0.028);

    // ── Link layer ─────────────────────────────────────────────────────────────
    const linkLayer = g.append('g').attr('class', 'links');

    const linkGs = linkLayer.selectAll<SVGGElement, GraphLink>('.lnk')
      .data(graphLinks).enter().append('g').attr('class', 'lnk');

    // Bezier path
    const paths = linkGs.append('path')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148,163,184,0.28)')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    // Link label
    const linkLabels = linkGs.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', 'rgba(148,163,184,0.55)')
      .style('pointer-events', 'none')
      .text((d: any) => d.label ?? '');

    // Delete btn (visible on hover)
    const linkDeletes = linkGs.append('circle')
      .attr('r', 7).attr('fill', '#ef4444').attr('stroke', '#fff')
      .attr('stroke-width', 1.5).attr('opacity', 0).style('cursor', 'pointer')
      .on('click', (ev: any, d: any) => {
        ev.stopPropagation();
        deleteLinkMutation.mutate(d.id);
      });

    linkGs
      .on('mouseenter', function (_, d: any) {
        d3.select(this).select('path')
          .transition().duration(160)
          .attr('stroke', d.source.fill ?? 'rgba(148,163,184,0.7)')
          .attr('stroke-width', 2.5);
        d3.select(this).select('circle')
          .transition().duration(160).attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).select('path')
          .transition().duration(200)
          .attr('stroke', 'rgba(148,163,184,0.28)').attr('stroke-width', 1.5);
        d3.select(this).select('circle')
          .transition().duration(200).attr('opacity', 0);
      });

    // ── Node layer ─────────────────────────────────────────────────────────────
    const nodeLayer = g.append('g').attr('class', 'nodes');

    const nodeGs = nodeLayer.selectAll<SVGGElement, GraphNode>('.nd')
      .data(graphNodes).enter().append('g').attr('class', 'nd')
      .style('cursor', 'pointer').style('opacity', 0);

    // Selection / connection-highlight ring
    nodeGs.append('circle').attr('class', 'node-ring')
      .attr('r', d => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', d => d.fill)
      .attr('stroke-width', 2.5)
      .attr('opacity', 0)
      .attr('stroke-dasharray', '4 3');

    // Outer soft halo (always visible, very faint)
    nodeGs.append('circle').attr('class', 'node-halo')
      .attr('r', d => d.radius + 4)
      .attr('fill', d => d.fill)
      .attr('opacity', 0.12)
      .style('filter', 'url(#glow)');

    // Main circle with radial gradient
    nodeGs.append('circle').attr('class', 'node-bg')
      .attr('r', d => d.radius)
      .attr('fill', d => `url(#grad-${d.nodeType in NODE_CONFIG ? d.nodeType : 'default'})`)
      .attr('stroke', d => d.light)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .style('filter', d => d.isCore ? 'url(#core-glow)' : '');

    // Inner shine (subtle)
    nodeGs.append('circle')
      .attr('r', d => d.radius * 0.42)
      .attr('cx', d => -d.radius * 0.22)
      .attr('cy', d => -d.radius * 0.28)
      .attr('fill', 'white').attr('opacity', 0.18)
      .style('pointer-events', 'none');

    // Type icon
    nodeGs.append('text').attr('class', 'node-icon')
      .attr('text-anchor', 'middle').attr('dy', '0.38em')
      .attr('font-size', d => `${d.radius * 0.72}px`)
      .attr('fill', 'white').attr('font-weight', 'bold')
      .style('pointer-events', 'none').style('user-select', 'none')
      .text(d => d.icon);

    // Title label below the circle
    nodeGs.append('text').attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.radius + 15)
      .attr('font-size', '11px').attr('font-weight', '500')
      .attr('fill', 'rgba(226,232,240,0.80)')
      .style('pointer-events', 'none').style('user-select', 'none')
      .each(function (d) {
        const max = 20;
        d3.select(this).text(d.title.length > max ? d.title.slice(0, max) + '…' : d.title);
      });

    // Node type badge (tiny pill above the circle for core nodes)
    nodeGs.filter(d => d.isCore).append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => -(d.radius + 10))
      .attr('font-size', '9px').attr('font-weight', '600')
      .attr('fill', d => d.light)
      .attr('letter-spacing', '0.06em')
      .style('pointer-events', 'none').style('user-select', 'none')
      .text('CORE');

    // Fade-in staggered
    nodeGs.transition()
      .delay((_, i) => i * 25).duration(450).ease(d3.easeQuadOut)
      .style('opacity', 1);

    // ── Drag ──────────────────────────────────────────────────────────────────

    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (ev, d) => {
        ev.sourceEvent.stopPropagation();
        if (!ev.active) sim.alphaTarget(0.25).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => {
        if (!ev.active) sim.alphaTarget(0);
        d.fx = ev.x; d.fy = ev.y; // stay pinned after drag
      });

    nodeGs.call(drag);

    // ── Hover: connection highlight ────────────────────────────────────────────

    nodeGs
      .on('mouseenter', function (_, hov) {
        const connectedIds = new Set(
          graphLinks.flatMap(l =>
            (l.source as GraphNode).id === hov.id ? [(l.target as GraphNode).id] :
            (l.target as GraphNode).id === hov.id ? [(l.source as GraphNode).id] : []
          )
        );

        // Dim unrelated nodes
        nodeGs.each(function (n) {
          const self = n.id === hov.id, conn = connectedIds.has(n.id);
          d3.select(this).transition().duration(200).style('opacity', self || conn ? 1 : 0.15);
          if (self) {
            d3.select(this).select('.node-bg')
              .transition().duration(200)
              .attr('r', n.radius * 1.18).attr('stroke-opacity', 1);
            d3.select(this).select('.node-halo')
              .transition().duration(200).attr('opacity', 0.3);
          }
        });

        // Highlight connected links
        linkGs.each(function (l: any) {
          const conn = (l.source as GraphNode).id === hov.id || (l.target as GraphNode).id === hov.id;
          d3.select(this).select('path')
            .transition().duration(200)
            .attr('stroke', conn ? hov.fill : 'rgba(148,163,184,0.07)')
            .attr('stroke-width', conn ? 2.5 : 1);
          d3.select(this).select('text')
            .transition().duration(200).attr('opacity', conn ? 1 : 0);
        });
      })
      .on('mouseleave', function () {
        nodeGs.transition().duration(220).style('opacity', 1);
        nodeGs.each(function (n) {
          d3.select(this).select('.node-bg')
            .transition().duration(220)
            .attr('r', n.radius).attr('stroke-opacity', 0.6);
          d3.select(this).select('.node-halo')
            .transition().duration(220).attr('opacity', 0.12);
        });
        linkGs.each(function () {
          d3.select(this).select('path')
            .transition().duration(220)
            .attr('stroke', 'rgba(148,163,184,0.28)').attr('stroke-width', 1.5);
          d3.select(this).select('text')
            .transition().duration(220).attr('opacity', 1);
        });
      });

    // ── Click: ripple + selection / callback ───────────────────────────────────

    nodeGs.on('click', function (ev, d) {
      ev.stopPropagation();

      // Ripple animation
      const ripple = d3.select(this).append('circle')
        .attr('r', d.radius).attr('fill', 'none')
        .attr('stroke', d.fill).attr('stroke-width', 2).attr('opacity', 0.75);
      ripple.transition().duration(700).ease(d3.easeQuadOut)
        .attr('r', d.radius * 2.6).attr('opacity', 0).attr('stroke-width', 0.5)
        .remove();

      if (isLinkingRef.current) {
        setSelectedNodes(prev => {
          const next = prev.includes(d.id) ? prev.filter(x => x !== d.id)
            : prev.length >= 2 ? [prev[1], d.id] : [...prev, d.id];
          if (next.length === 2) setTimeout(() => setIsLinkDialogOpen(true), 50);
          return next;
        });
      } else {
        onClickRef.current?.(d.id);
      }
    });

    // ── Tick: update positions ─────────────────────────────────────────────────

    const getBezier = (src: GraphNode, tgt: GraphNode) => {
      if (src.x == null || tgt.x == null) return '';
      const dx = tgt.x - src.x, dy = tgt.y - src.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Start and end at node boundaries
      const sx = src.x + (dx / dist) * src.radius;
      const sy = src.y + (dy / dist) * src.radius;
      const tx = tgt.x - (dx / dist) * tgt.radius;
      const ty = tgt.y - (dy / dist) * tgt.radius;
      // Perpendicular offset for curve — larger for shorter links
      const bend = Math.min(dist * 0.22, 45);
      const cx = (sx + tx) / 2 - (dy / dist) * bend;
      const cy = (sy + ty) / 2 + (dx / dist) * bend;
      return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
    };

    sim.on('tick', () => {
      paths.attr('d', (d: any) => getBezier(d.source as GraphNode, d.target as GraphNode));

      linkLabels.attr('transform', (d: any) => {
        const s = d.source as GraphNode, t = d.target as GraphNode;
        return `translate(${((s.x ?? 0) + (t.x ?? 0)) / 2}, ${((s.y ?? 0) + (t.y ?? 0)) / 2 - 10})`;
      });

      linkDeletes
        .attr('cx', (d: any) => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('cy', (d: any) => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      nodeGs.attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`);

      // Persist positions so they survive any data-driven rebuild
      graphNodes.forEach(n => {
        nodePositionsRef.current.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, fx: n.fx ?? undefined, fy: n.fy ?? undefined });
      });
    });

    // ── Zoom & Pan ─────────────────────────────────────────────────────────────

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 6])
      .on('zoom', ev => g.attr('transform', ev.transform));

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Fit to container on first load
    svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.05, height * 0.05).scale(0.75));

    // ── Focus on specific node ─────────────────────────────────────────────────

    if (focusNodeId) {
      setTimeout(() => {
        const fn = graphNodes.find(n => n.id === focusNodeId);
        if (!fn) return;
        const scale = 1.5;
        const tx = width / 2 - (fn.x ?? 0) * scale;
        const ty = height / 2 - (fn.y ?? 0) * scale;
        svg.transition().duration(1000).ease(d3.easeCubicInOut)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

        // Pulse the focused node
        nodeGs.filter(d => d.id === focusNodeId)
          .select('.node-ring')
          .transition().duration(500).attr('opacity', 1)
          .transition().duration(500).attr('opacity', 0.4)
          .transition().duration(500).attr('opacity', 1);
      }, 1200);
    }

    return () => { sim.stop(); };
  }, [nodes, links, dimensions]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`w-full h-full relative bg-[#060b14] ${className}`}>

      {/* Link creation dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Label (optional)</Label>
              <Input
                value={linkLabel}
                onChange={e => setLinkLabel(e.target.value)}
                placeholder="e.g. depends on, related to…"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Relationship type</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="related">Related</SelectItem>
                  <SelectItem value="depends">Depends On</SelectItem>
                  <SelectItem value="blocks">Blocks</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setIsLinkDialogOpen(false); setSelectedNodes([]); }}>
                Cancel
              </Button>
              <Button onClick={handleConfirmLink} disabled={createLinkMutation.isPending}>
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Linking-mode indicator */}
      {isLinkingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-primary/90 text-primary-foreground text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm pointer-events-none">
          <span className={`w-2 h-2 rounded-full ${selectedNodes.length === 0 ? 'bg-white/50' : 'bg-white'}`} />
          {selectedNodes.length === 0
            ? 'Click a node to start connecting'
            : `${selectedNodes.length}/2 nodes selected — click another to link`}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        {Object.entries(NODE_CONFIG).filter(([k]) => k !== 'default').map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.fill }} />
            <span className="text-[10px] text-white/40 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
        onMouseDown={e => { if (e.currentTarget === e.target) e.currentTarget.style.cursor = 'grabbing'; }}
        onMouseUp={e => { e.currentTarget.style.cursor = 'grab'; }}
      />
    </div>
  );
});

InteractiveNodeGraph.displayName = 'InteractiveNodeGraph';
export default InteractiveNodeGraph;
