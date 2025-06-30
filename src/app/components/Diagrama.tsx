// src/app/components/Diagrama.tsx
'use client';


import { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Componente, GrupoParalelo, GrupoSerie, Resistor } from '../lib/circuit-logic';

// --- Constantes de Layout ---
const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const X_GAP = 100;
const Y_GAP = 80;

// --- Tipos e Funções Auxiliares ---
type LayoutResult = {
  nodes: Node[];
  edges: Edge[];
  entryIds: string[];
  exitIds: string[];
  yCenter: number;
  height: number;
  width: number;
};

// Funções para encontrar o ID do primeiro e último resistor em qualquer componente
function findFirstResistorId(componente: Componente): string | null {
  if (componente instanceof Resistor) return componente.id;
  if (componente.componentes.length > 0) return findFirstResistorId(componente.componentes[0]);
  return null;
}

function findLastResistorId(componente: Componente): string | null {
  if (componente instanceof Resistor) return componente.id;
  if (componente.componentes.length > 0) return findLastResistorId(componente.componentes[componente.componentes.length - 1]);
  return null;
}


// --- Função Principal de Geração do Diagrama ---
// Esta função está correta, ela apenas posiciona os nós e define as conexões internas
function generateFlowElements(componente: Componente, x = 0, y = 0): LayoutResult {
  // Caso Base: Resistor
  if (componente instanceof Resistor) {
    const node: Node = {
      id: componente.id,
      position: { x, y },
      data: { label: `${componente.identificador}\n${componente.resistencia_ohm.toFixed(1)}Ω` },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: { width: NODE_WIDTH, height: NODE_HEIGHT, textAlign: 'center' },
    };
    return {
      nodes: [node], edges: [],
      entryIds: [componente.id], exitIds: [componente.id],
      yCenter: y + NODE_HEIGHT / 2, width: NODE_WIDTH, height: NODE_HEIGHT,
    };
  }

  const allNodes: Node[] = [];
  const allEdges: Edge[] = [];
  let allEntryIds: string[] = [];
  let allExitIds: string[] = [];
  let width = 0;
  let height = 0;
  let yCenter = 0;

  // Processamento para Grupos
  if (componente.componentes.length > 0) {
    if (componente instanceof GrupoSerie) {
      let currentX = x;
      let lastExits: string[] = [];
      componente.componentes.forEach((child, index) => {
        const childLayout = generateFlowElements(child, currentX, y);
        allNodes.push(...childLayout.nodes);
        allEdges.push(...childLayout.edges);
        if (lastExits.length > 0) {
          lastExits.forEach(sourceId => {
            childLayout.entryIds.forEach(targetId => {
              allEdges.push({ id: `e-${sourceId}-${targetId}`, source: sourceId, target: targetId, type: 'smoothstep' });
            });
          });
        }
        lastExits = childLayout.exitIds;
        if (index === 0) allEntryIds = childLayout.entryIds;
        if (index === componente.componentes.length - 1) allExitIds = childLayout.exitIds;

        const avgWidth = childLayout.nodes.reduce((acc, node) => Math.max(acc, node.position.x + (node.style?.width as number || 0)), 0) - currentX;
        currentX += avgWidth + X_GAP;
      });
    }

    if (componente instanceof GrupoParalelo) {
      let currentY = y;
      componente.componentes.forEach(child => {
        const childLayout = generateFlowElements(child, x, currentY);
        allNodes.push(...childLayout.nodes);
        allEdges.push(...childLayout.edges);
        allEntryIds.push(...childLayout.entryIds);
        allExitIds.push(...childLayout.exitIds);
        currentY += childLayout.nodes.reduce((max, node) => Math.max(max, (node.style?.height as number || 0)), 0) + Y_GAP;
      });
    }
  }

  // Calcula as dimensões e centro para o layout atual
  if (allNodes.length > 0) {
    const xMin = Math.min(...allNodes.map(n => n.position.x));
    const xMax = Math.max(...allNodes.map(n => n.position.x + (n.style?.width as number || 0)));
    const yMin = Math.min(...allNodes.map(n => n.position.y));
    const yMax = Math.max(...allNodes.map(n => n.position.y + (n.style?.height as number || 0)));
    width = xMax - xMin;
    height = yMax - yMin;
    yCenter = yMin + height / 2;
  }

  return { nodes: allNodes, edges: allEdges, entryIds: allEntryIds, exitIds: allExitIds, width, height, yCenter };
}

// --- Componente React Principal ---
export default function Diagrama({ circuito }: { circuito: Componente }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const layout = generateFlowElements(circuito, 250, 100);

    // Se não houver nós (circuito vazio), limpa o diagrama
    if (layout.nodes.length === 0) {
      setNodes([]); setEdges([]);
      return;
    }

    const sourceNode: Node = {
      id: 'source',
      type: 'default',
      data: { label: 'Fonte V+' },
      position: { x: 50, y: layout.yCenter },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
      style: { backgroundColor: '#0369a1', color: 'white', width: 80 }
    };

    const finalNodes: Node[] = [sourceNode, ...layout.nodes];
    const finalEdges: Edge[] = [...layout.edges];

    // *** A CORREÇÃO ESTÁ AQUI ***

    // 1. Encontra o PRIMEIRO resistor de todo o circuito.
    const firstResistorId = findFirstResistorId(circuito);

    // 2. Encontra o ÚLTIMO resistor de todo o circuito.
    const lastResistorId = findLastResistorId(circuito);

    // 3. Conecta a fonte SOMENTE ao primeiro resistor.
    if (firstResistorId) {
      finalEdges.push({ id: `e-source-${firstResistorId}`, source: 'source', target: firstResistorId, type: 'smoothstep', animated: true });
    }

    // 4. Conecta o último resistor de volta à fonte para fechar o laço.
    if (lastResistorId) {
      finalEdges.push({ id: `e-${lastResistorId}-source`, source: lastResistorId, target: 'source', type: 'smoothstep', animated: true });
    }

    setNodes(finalNodes);
    setEdges(finalEdges);

  }, [circuito, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        nodesDraggable={true}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}