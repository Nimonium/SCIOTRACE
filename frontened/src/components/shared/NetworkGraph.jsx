import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { roleColors } from '../../utils/styles';
import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';

export function NetworkGraph({ 
  data, 
  isMini = false, 
  narrativeId = 'default',
  activeRoles = ['Originator', 'Amplifier', 'Bridge', 'Authority'],
  onNodeClick
}) {
  const fgRef = useRef();
  const navigate = useNavigate();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const [hoverNode, setHoverNode] = useState(null);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    
    const timeout = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.d3Force('charge').strength(isMini ? -50 : -200);
        fgRef.current.zoomToFit(isMini ? 400 : 800);
      }
    }, 100);
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMini, data]);

  const graphData = useMemo(() => {
    if (!data || !data.nodes) return { nodes: [], links: [] };
    const rawLinks = data.links || data.edges || [];
    if (isMini) return { nodes: data.nodes, links: rawLinks };

    const activeRolesLower = activeRoles.map(r => r.toLowerCase());
    const filteredNodes = data.nodes.filter(n => activeRolesLower.includes(n.role?.toLowerCase() || 'originator'));
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = rawLinks.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [data, activeRoles, isMini]);

  const { neighbors, links } = useMemo(() => {
    const neighbors = new Map();
    const links = new Set();
    
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (!neighbors.has(sourceId)) neighbors.set(sourceId, new Set());
      if (!neighbors.has(targetId)) neighbors.set(targetId, new Set());
      
      neighbors.get(sourceId).add(targetId);
      neighbors.get(targetId).add(sourceId);
      links.add(`${sourceId}-${targetId}`);
      links.add(`${targetId}-${sourceId}`);
    });
    
    return { neighbors, links };
  }, [graphData]);

  const handleNodeHover = useCallback((node) => {
    if (isMini) return;
    setHoverNode(node);
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, [isMini]);

  if (!graphData.nodes.length) return (
    <div className={`relative bg-panel border border-border rounded-lg flex items-center justify-center ${isMini ? 'h-64' : 'h-full w-full'}`}>
      <p className="text-muted text-sm">No nodes match current filters.</p>
    </div>
  );

  return (
    <div 
      className={`relative bg-panel border border-border rounded-lg overflow-hidden ${isMini ? 'h-64' : 'h-full w-full'}`}
      ref={containerRef}
    >
      {isMini && (
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Network Topology</h3>
        </div>
      )}
      
      {isMini && (
        <button
          onClick={() => navigate(`/network/${narrativeId}`)}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-elevated/80 backdrop-blur text-ink text-xs font-medium py-1.5 px-3 rounded hover:bg-violet transition-all duration-200 shadow"
        >
          <Maximize2 size={12} />
          View full network
        </button>
      )}

      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeRelSize={isMini ? 4 : 6}
          nodeVal={node => node.influence_score || 1}
          nodeColor={node => {
            const baseColor = roleColors[node.role?.toLowerCase()] || roleColors.originator;
            if (isMini || !hoverNode) return baseColor;
            
            const isHovered = node.id === hoverNode.id;
            const isNeighbor = neighbors.get(hoverNode.id)?.has(node.id);
            
            if (isHovered || isNeighbor) return baseColor;
            return '#3E5551'; // muted hex
          }}
          linkColor={link => {
            if (isMini || !hoverNode) return '#8FB6AF'; // border hex
            
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            const isRelated = 
              (sourceId === hoverNode.id && neighbors.get(hoverNode.id)?.has(targetId)) ||
              (targetId === hoverNode.id && neighbors.get(hoverNode.id)?.has(sourceId));
            
            return isRelated ? '#22E6D6' : '#8FB6AF'; // cyan vs border
          }}
          linkOpacity={link => {
            if (isMini || !hoverNode) return 0.3;
            
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            const isRelated = 
              (sourceId === hoverNode.id && neighbors.get(hoverNode.id)?.has(targetId)) ||
              (targetId === hoverNode.id && neighbors.get(hoverNode.id)?.has(sourceId));
              
            return isRelated ? 0.8 : 0.05;
          }}
          linkWidth={link => {
            if (isMini || !hoverNode) return 1;
            
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            const isRelated = 
              (sourceId === hoverNode.id && neighbors.get(hoverNode.id)?.has(targetId)) ||
              (targetId === hoverNode.id && neighbors.get(hoverNode.id)?.has(sourceId));
              
            return isRelated ? 2 : 1;
          }}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node, ctx, globalScale) => {
            if (isMini) return;
            
            const isHovered = hoverNode && node.id === hoverNode.id;
            
            if (isHovered) {
              const val = node.influence_score || 1;
              const r = Math.sqrt(Math.max(0, val)) * 6;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r * 1.3, 0, 2 * Math.PI, false);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.fill();
            }

            if (isHovered || (globalScale > 2 && (neighbors.get(hoverNode?.id)?.has(node.id)))) {
              const label = node.id.length > 8 ? node.id.substring(0, 8) + '...' : node.id;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
              ctx.fillStyle = 'rgba(168, 201, 195, 0.9)'; // elevated hex
              ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 8, bckgDimensions[0], bckgDimensions[1]);
              
              ctx.fillStyle = '#132523'; // ink hex
              ctx.fillText(label, node.x, node.y + 8 + bckgDimensions[1]/2);
            }
          }}
          backgroundColor="transparent"
          enableZoomInteraction={!isMini}
          enablePanInteraction={!isMini}
          onNodeHover={handleNodeHover}
          onNodeClick={(node) => {
            if (!isMini && onNodeClick) {
              onNodeClick(node);
            }
          }}
        />
      )}
    </div>
  );
}
