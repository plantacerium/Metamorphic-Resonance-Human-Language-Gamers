// src/services/polyhedron-layout.js
// Asigna coordenadas poliédricas 2D/3D proyectadas a clústeres de nodos

// Biblioteca de sólidos platónicos y figuras de mayor complejidad
const POLYHEDRONS = {
  tetrahedron: [ // 4 vertices
    [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
  ],
  dipyramid: [ // 5 vertices (Triangular dipyramid)
    [0, 1.5, 0], [0, -1.5, 0], // Poles
    [1, 0, 0], [-0.5, 0, 0.866], [-0.5, 0, -0.866] // Equator
  ],
  octahedron: [ // 6 vertices
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
  ],
  cube: [ // 8 vertices
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ],
  icosahedron: [ // 12 vertices (Golden ratio phi ~ 1.618)
    [0, 1.618, 1], [0, 1.618, -1], [0, -1.618, 1], [0, -1.618, -1],
    [1, 0, 1.618], [1, 0, -1.618], [-1, 0, 1.618], [-1, 0, -1.618],
    [1.618, 1, 0], [1.618, -1, 0], [-1.618, 1, 0], [-1.618, -1, 0]
  ],
  dodecahedron: [ // 20 vertices (phi)
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, 0.618, 1.618], [0, 0.618, -1.618], [0, -0.618, 1.618], [0, -0.618, -1.618],
    [1.618, 0, 0.618], [1.618, 0, -0.618], [-1.618, 0, 0.618], [-1.618, 0, -0.618],
    [0.618, 1.618, 0], [0.618, -1.618, 0], [-0.618, 1.618, 0], [-0.618, -1.618, 0]
  ]
};

// Generador de Buckyball (Icosaedro truncado) - 60 vertices aproximados esféricamente (Phyllotaxis)
function generateSpherePoints(n) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    points.push([x * 2, y * 2, z * 2]); // Scale by 2 for visual spread
  }
  return points;
}

// Proyección isométrica simple 3D -> 2D
function project3Dto2D(x, y, z) {
  // Isometric projection matrix approximation
  const x2d = (x - z) * Math.cos(Math.PI / 6);
  const y2d = y + (x + z) * Math.sin(Math.PI / 6);
  return { x: x2d, y: y2d };
}

// Escoge la figura según la complejidad (n = nodos en el componente)
// Si la cantidad no coincide exactamente con un poliedro, generamos una esfera perfecta para evitar asimetrías
function getPolyhedronVertices(n) {
  if (n === 1) return [[0, 0, 0]];
  if (n === 2) return [[-1, 0, 0], [1, 0, 0]];
  if (n === 3) return [[0, 1, 0], [-0.866, -0.5, 0], [0.866, -0.5, 0]];
  
  if (n === 4) return POLYHEDRONS.tetrahedron;
  if (n === 5) return POLYHEDRONS.dipyramid;
  if (n === 6) return POLYHEDRONS.octahedron;
  if (n === 8) return POLYHEDRONS.cube;
  if (n === 12) return POLYHEDRONS.icosahedron;
  if (n === 20) return POLYHEDRONS.dodecahedron;
  
  // Para cualquier otro número impar/asimétrico (ej: 7, 9, 13), generamos 
  // exactamente N vértices en una esfera phyllotaxis perfecta.
  return generateSpherePoints(n);
}

// Encuentra componentes conectados usando BFS
function findConnectedComponents(nodes, edges) {
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source).push(e.target);
      adj.get(e.target).push(e.source);
    }
  });

  const visited = new Set();
  const components = [];
  const singletons = [];

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const comp = [];
      const queue = [node.id];
      visited.add(node.id);
      
      while (queue.length > 0) {
        const current = queue.shift();
        comp.push(current);
        const neighbors = adj.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      if (comp.length === 1) {
        singletons.push(comp[0]);
      } else {
        components.push(comp);
      }
    }
  }
  
  if (singletons.length > 0) {
    components.push(singletons);
  }

  return components.sort((a, b) => b.length - a.length); // Más grandes primero
}

/**
 * Recibe un array de nodos y aristas y les asigna coordenadas (x, y) 
 * organizándolos en múltiples poliedros espaciados.
 */
export function applyPolyhedralLayout(graphData) {
  const components = findConnectedComponents(graphData.nodes, graphData.edges);
  const layout = new Map();

  // Grid layout para distribuir los distintos poliedros/componentes en el espacio 2D
  let currentX = 0;
  let currentY = 0;
  let maxH = 0;
  let rowWidth = 0;

  components.forEach(comp => {
    const N = comp.length;
    const vertices3D = getPolyhedronVertices(N);
    
    // Escala del poliedro según cantidad de nodos (logarítmico para que no explote)
    const scale = 10 + Math.log(N + 1) * 15; 
    
    comp.forEach((nodeId, i) => {
      // Si hay más nodos que vértices (ej: 23 nodos en dodecaedro de 20), reutilizamos vértices añadiendo algo de ruido
      const vIndex = i % vertices3D.length;
      let [x3, y3, z3] = vertices3D[vIndex];
      
      // Añadir ligero ruido si reutilizamos vértices para que no se superpongan exactamente
      if (i >= vertices3D.length) {
        x3 += (Math.random() - 0.5) * 0.2;
        y3 += (Math.random() - 0.5) * 0.2;
        z3 += (Math.random() - 0.5) * 0.2;
      }

      const p2d = project3Dto2D(x3, y3, z3);
      
      layout.set(nodeId, {
        x: currentX + (p2d.x * scale),
        y: currentY + (p2d.y * scale)
      });
    });

    // Calcular espaciado para el siguiente componente
    const step = scale * 2.5;
    currentX += step;
    rowWidth += step;
    if (scale > maxH) maxH = scale;

    if (rowWidth > 300) { // Salto de línea en el grid espacial
      currentX = 0;
      currentY += maxH * 2.5;
      rowWidth = 0;
      maxH = 0;
    }
  });

  // Aplicar layout a los nodos y agregar estilos estéticos
  graphData.nodes.forEach(node => {
    if (layout.has(node.id)) {
      const pos = layout.get(node.id);
      node.x = pos.x;
      node.y = pos.y;
    } else {
      node.x = Math.random() * 100;
      node.y = Math.random() * 100;
    }
    
    // Colores basados en el tipo de nodo para dar estética de "cerebro"
    if (node.group === "memory") {
      node.color = "#c9a84c"; // Gold para memorias
      node.size = 5;
    } else {
      node.color = "#1a3a5c"; // Sapphire para conceptos abstractos
      node.size = 8;
    }
  });

  // Dar estilo a las aristas
  graphData.edges.forEach(edge => {
    edge.color = "rgba(255, 255, 255, 0.1)"; // Blanco semitransparente como sinapsis
    edge.size = 1;
  });

  return graphData;
}
