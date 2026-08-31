import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AppDatabaseState } from '../../services/db';
import { ComprehensiveIntegrityReport } from '../../utils/accountingIntegrity';

interface FinancialFlowGraphProps {
  db: AppDatabaseState;
  auditReport: ComprehensiveIntegrityReport;
}

export const FinancialFlowGraph: React.FC<FinancialFlowGraphProps> = ({ db, auditReport }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 600;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Data Processing for Graph
    const nodes: any[] = [];
    const links: any[] = [];

    // Base conceptual nodes
    const baseNodes = [
      { id: 'Source_Income', label: 'Income Sources', group: 'source', color: '#10b981' },
      { id: 'Source_Expense', label: 'Expense Sources', group: 'source', color: '#f43f5e' },
      { id: 'Source_Capital', label: 'Capital/Admissions', group: 'source', color: '#3b82f6' },
      { id: 'Source_Contra', label: 'Contra', group: 'source', color: '#8b5cf6' },
      { id: 'Ledger_Journal', label: 'General Journal', group: 'ledger', color: '#64748b' },
      { id: 'Asset_Cash', label: 'Cash Book', group: 'asset', color: '#0ea5e9' },
      { id: 'Asset_Bank', label: 'Bank Book', group: 'asset', color: '#0284c7' }
    ];

    baseNodes.forEach(n => nodes.push({ ...n, radius: 40 }));

    // Flow links (Normal Flow)
    links.push({ source: 'Source_Income', target: 'Ledger_Journal', value: 5, type: 'normal' });
    links.push({ source: 'Source_Capital', target: 'Ledger_Journal', value: 5, type: 'normal' });
    links.push({ source: 'Source_Contra', target: 'Ledger_Journal', value: 3, type: 'normal' });
    links.push({ source: 'Ledger_Journal', target: 'Source_Expense', value: 5, type: 'normal' });
    links.push({ source: 'Ledger_Journal', target: 'Asset_Cash', value: 6, type: 'normal' });
    links.push({ source: 'Ledger_Journal', target: 'Asset_Bank', value: 6, type: 'normal' });

    // Process Anomalies from auditReport
    let anomalyCount = 0;
    auditReport.violationsList.forEach(v => {
      const isOrphan = v.category.includes('ORPHAN');
      const isDuplicate = v.category.includes('DUPLICATE');
      
      if (isOrphan || isDuplicate) {
        anomalyCount++;
        const nodeId = `Anomaly_${v.violationId || anomalyCount}`;
        const nodeColor = isOrphan ? '#f97316' : '#ef4444'; // Orange for orphan, Red for duplicate
        
        nodes.push({
          id: nodeId,
          label: `${isOrphan ? 'Orphan' : 'Duplicate'}: ${v.voucherId || v.transactionId || 'Unknown'}`,
          group: 'anomaly',
          color: nodeColor,
          radius: 20,
          details: v.description
        });

        // Determine where to link it loosely
        if (v.module === 'CASH_BOOK') {
          links.push({ source: nodeId, target: 'Asset_Cash', value: 2, type: 'anomaly' });
        } else if (v.module === 'BANK_BOOK') {
          links.push({ source: nodeId, target: 'Asset_Bank', value: 2, type: 'anomaly' });
        } else if (v.module === 'JOURNAL') {
          // If orphan journal line, it should link to Journal, or maybe float
          links.push({ source: nodeId, target: 'Ledger_Journal', value: 1, type: 'anomaly' });
        } else {
          // If source duplicate
          links.push({ source: nodeId, target: 'Ledger_Journal', value: 2, type: 'anomaly' });
        }
      }
    });

    if (anomalyCount === 0) {
      // Add a dummy node just to show health if no anomalies exist
      nodes.push({ id: 'Health_OK', label: 'No Orphans/Duplicates', group: 'health', color: '#22c55e', radius: 30 });
      links.push({ source: 'Health_OK', target: 'Ledger_Journal', value: 1, type: 'health' });
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => d.radius + 10));

    // Add zoom capabilities
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
      
    svg.call(zoom);

    const g = svg.append('g');

    // Define arrow markers
    svg.append('defs').selectAll('marker')
      .data(['normal', 'anomaly', 'health'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28) // Adjust based on node radius
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => d === 'normal' ? '#94a3b8' : d === 'anomaly' ? '#ef4444' : '#22c55e')
      .attr('d', 'M0,-5L10,0L0,5');

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => d.type === 'normal' ? '#94a3b8' : d.type === 'anomaly' ? '#ef4444' : '#22c55e')
      .attr('stroke-width', (d: any) => d.type === 'normal' ? 3 : 2)
      .attr('stroke-dasharray', (d: any) => d.type === 'anomaly' ? '5,5' : 'none')
      .attr('marker-end', (d: any) => `url(#arrow-${d.type})`);

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', (d: any) => d.radius)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .call(d3.drag<SVGCircleElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Node labels
    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: any) => d.label)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('fill', '#1e293b')
      .attr('dy', (d: any) => d.radius + 15);

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'absolute hidden bg-slate-900 text-white text-xs p-2 rounded-lg shadow-xl pointer-events-none z-50 max-w-xs')
      .style('opacity', 0);

    node.on('mouseover', (event, d: any) => {
      tooltip.transition().duration(200).style('opacity', 1);
      tooltip.html(`
        <div class="font-bold mb-1">${d.label}</div>
        ${d.details ? `<div class="text-slate-300">${d.details}</div>` : `<div class="text-slate-300 capitalize">Type: ${d.group}</div>`}
      `)
      .classed('hidden', false)
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 28) + 'px');
      
      d3.select(event.currentTarget).attr('stroke', '#334155').attr('stroke-width', 4);
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', (event, d: any) => {
      tooltip.transition().duration(500).style('opacity', 0).on('end', function() {
        d3.select(this).classed('hidden', true);
      });
      d3.select(event.currentTarget).attr('stroke', '#fff').attr('stroke-width', 3);
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)))
        .attr('cy', (d: any) => d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)));

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      d3.select(containerRef.current).selectAll('.absolute').remove();
    };
  }, [db, auditReport]);

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden relative">
      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xs">
        <h4 className="text-xs font-bold text-slate-800 mb-2">Legend</h4>
        <div className="space-y-1.5 text-[10px] font-medium text-slate-600">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Income/Source</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#64748b]"></span> General Journal</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#0ea5e9]"></span> Cash/Bank Ledgers</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f97316]"></span> Orphan Entry</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> Duplicate Entry</div>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[600px] cursor-move">
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>
    </div>
  );
};
