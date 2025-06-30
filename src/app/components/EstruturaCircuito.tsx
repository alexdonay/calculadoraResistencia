// src/app/components/EstruturaCircuito.tsx
'use client';

import { ChevronRight, Dot } from 'lucide-react';
import { Componente, GrupoParalelo, GrupoSerie, Resistor } from '../lib/circuit-logic';

type NodeProps = {
  node: Componente;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
};

const CircuitNode = ({ node, selectedNodeId, onSelect }: NodeProps) => {
  const isSelected = node.id === selectedNodeId;
  const isGroup = node.componentes.length > 0;

  let typeInfo = '';
  if (node instanceof Resistor) typeInfo = `Resistor - ${node.resistencia_ohm.toFixed(2)} Ω`;
  if (node instanceof GrupoSerie) typeInfo = 'Grupo Série';
  if (node instanceof GrupoParalelo) typeInfo = 'Grupo Paralelo';

  return (
    <li className="my-1">
      <div onClick={() => onSelect(node.id)} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-cyan-600' : 'hover:bg-gray-600'}`}>
        {isGroup ? <ChevronRight size={16} className="mr-1" /> : <Dot size={16} className="mr-1" />}
        <div className="flex flex-col">
          <span className="font-bold text-sm">{node.identificador}</span>
          <span className="text-xs text-gray-400">{typeInfo}</span>
        </div>
      </div>
      {isGroup && (
        <ul className="pl-4 border-l border-gray-600 ml-2">
          {node.componentes.map((child: Componente) => (
            <CircuitNode key={child.id} node={child} selectedNodeId={selectedNodeId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function EstruturaCircuito({ circuito, selectedNodeId, onSelectNode }: { circuito: Componente, selectedNodeId: string | null, onSelectNode: (id: string) => void }) {
  return (
    <div className="p-2 h-full overflow-y-auto bg-gray-800">
      <ul>
        <CircuitNode node={circuito} selectedNodeId={selectedNodeId} onSelect={onSelectNode} />
      </ul>
    </div>
  );
}