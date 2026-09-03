import { invoke } from '@tauri-apps/api/core';
import Graph from 'graphology';
import Sigma from 'sigma';
import { applyPolyhedralLayout } from '../services/polyhedron-layout.js';

let currentRenderer = null;

export async function renderBrystal(container) {
  if (currentRenderer) {
    currentRenderer.kill();
    currentRenderer = null;
  }
  container.innerHTML = `
    <div class="brystal-container parchment-card" style="position:relative; width:100%; height:calc(100vh - 120px); overflow:hidden; padding: 0;">
      <div class="ornate-header" style="position:absolute; top:20px; left:20px; z-index:10; pointer-events:none; text-align: left;">
        <h1 style="margin:0; text-shadow: 1px 1px 2px rgba(201, 168, 76, 0.4);">💎 Brystal</h1>
        <p class="subtitle" style="margin:0;">Co-created Neural Topology</p>
      </div>
      
      <div id="brystal-loading" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:var(--ink-dark); font-family:var(--font-heading); z-index:5;">
        Extracting geometry from SurrealDB...
      </div>

      <div id="sigma-container" style="width:100%; height:100%; background:transparent;"></div>
      
      <div id="brystal-tooltip" style="position:fixed; display:none; background:var(--parchment-light); border:2px solid var(--parchment-edge); color:var(--ink-dark); padding:10px; border-radius:var(--radius-md); pointer-events:none; font-family:var(--font-body); max-width:300px; z-index:9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>
    </div>
  `;

  const sigmaContainer = document.getElementById('sigma-container');
  const loadingEl = document.getElementById('brystal-loading');
  const tooltip = document.getElementById('brystal-tooltip');

  try {
    // 1. Fetch data from Rust (SurrealDB)
    console.log("Fetching brain graph...");
    const rawData = await invoke('graph_export_brain');
  
    // Deduplicate identical nodes (e.g. from retries or identical messages across games)
    // This merges them into a single node, which acts as a shared concept hub!
    const uniqueNodes = [];
    const textToKeptId = new Map();
    const idRemap = new Map();

    rawData.nodes.forEach(n => {
      const textHash = (n.full_text || n.label).trim().toLowerCase();
      if (!textToKeptId.has(textHash)) {
        textToKeptId.set(textHash, n.id);
        uniqueNodes.push(n);
        idRemap.set(n.id, n.id);
      } else {
        idRemap.set(n.id, textToKeptId.get(textHash));
      }
    });
    
    rawData.nodes = uniqueNodes;
    rawData.edges.forEach(e => {
      if (idRemap.has(e.source)) e.source = idRemap.get(e.source);
      if (idRemap.has(e.target)) e.target = idRemap.get(e.target);
    });

    if (!rawData.nodes || rawData.nodes.length === 0) {
      loadingEl.textContent = "The brain is empty. Play a game to form memories.";
      return;
    }

    // 2. Apply Geometry Algorithm
    const geometryData = applyPolyhedralLayout(rawData);
    loadingEl.style.display = 'none';

    // 3. Build Graphology graph
    const graph = new Graph();
    
    geometryData.nodes.forEach(n => {
      if (!graph.hasNode(n.id)) {
        graph.addNode(n.id, {
          x: n.x,
          y: n.y,
          size: n.size || 5,
          label: n.label,
          full_text: n.full_text,
          color: n.color || '#ffffff',
          group: n.group
        });
      }
    });

    geometryData.edges.forEach(e => {
      // Evitar aristas duplicadas o referencias a nodos inexistentes
      if (graph.hasNode(e.source) && graph.hasNode(e.target)) {
        if (!graph.hasEdge(e.source, e.target)) {
          const edgeColor = e.rel_type === 'mentions' 
            ? 'rgba(201, 168, 76, 0.5)' // Gold for memory->concept
            : 'rgba(26, 58, 92, 0.5)';   // Sapphire for concept->concept
          graph.addEdge(e.source, e.target, {
            type: 'line',
            size: e.rel_type === 'mentions' ? 1.5 : 2,
            color: edgeColor
          });
        }
      }
    });

    const renderer = new Sigma(graph, sigmaContainer, {
      renderEdgeLabels: true,
      defaultEdgeColor: '#333333',
      defaultNodeColor: '#ffffff',
      labelFont: 'Inter, sans-serif',
      labelColor: { color: '#aaaaaa' },
      labelSize: 12,
      minCameraRatio: 0.1,
      maxCameraRatio: 10,
    });
    
    currentRenderer = renderer;

    // 5. Interactions
    renderer.on('enterNode', ({ node, event }) => {
      const attrs = graph.getNodeAttributes(node);
      document.body.style.cursor = 'pointer';
      
      tooltip.style.display = 'block';
      tooltip.innerHTML = `
        <div style="font-size:0.7rem; color:var(--gold-faint); text-transform:uppercase; margin-bottom: 4px;">${attrs.group}</div>
        <div style="font-size:0.9rem; line-height:1.4;">${attrs.full_text || attrs.label}</div>
      `;
      // Use pure CSS to perfectly center the fixed element on the screen
      tooltip.style.left = '50%';
      tooltip.style.top = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    });

    renderer.on('leaveNode', () => {
      document.body.style.cursor = 'default';
      tooltip.style.display = 'none';
    });

  } catch (error) {
    console.error("Failed to render Brystal:", error);
    loadingEl.textContent = "Error: " + error.toString();
  }
}
