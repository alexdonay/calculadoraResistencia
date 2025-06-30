// src/app/page.tsx
'use client';

import { produce } from 'immer';
import Papa, { ParseResult } from 'papaparse';
import { ChangeEvent, useState } from 'react';

import Diagrama from './components/Diagrama';
import EstruturaCircuito from './components/EstruturaCircuito';
import Ferramentas from './components/Ferramentas';
import Resultados from './components/Resultados';
import TutorialModal from './components/TutorialModal';
import { Circuito, Componente, GrupoParalelo, GrupoSerie, Resistor } from './lib/circuit-logic';

// --- Funções e Tipos Auxiliares ---
const findNodeById = (node: Componente, id: string): { node: Componente, parent: Componente | null } | null => {
  if (node.id === id) return { node, parent: null };
  for (const child of node.componentes) {
    if (child.id === id) return { node: child, parent: node };
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

let resistorCount = 0;
let groupCount = 0;

// Tipo para as linhas do CSV
interface CsvRow {
  id: string;
  parent_id: string | null;
  type: string;
  identifier: string;
  value: string | number;
}

export default function Home() {
  const [circuito, setCircuito] = useState<Componente>(new GrupoSerie("Circuito Principal"));
  const [tensao, setTensao] = useState<number>(12);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(circuito.id);
  const [relatorio, setRelatorio] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialText, setTutorialText] = useState("");

  const updateCircuito = (recipe: (draft: Componente) => void) => {
    setCircuito(produce(circuito, recipe));
  };

  const handleAddResistor = () => {
    if (!selectedNodeId) return;
    const value = prompt("Digite o valor da resistência (Ω):");
    if (value && !isNaN(Number(value)) && Number(value) > 0) {
      updateCircuito(draft => {
        const result = findNodeById(draft, selectedNodeId);
        if (result && result.node.componentes !== undefined) {
          resistorCount++;
          result.node.componentes.push(new Resistor(`R${resistorCount}`, Number(value)));
        }
      });
    }
  };

  const handleAddGrupo = (type: 'serie' | 'paralelo') => {
    if (!selectedNodeId) return;
    updateCircuito(draft => {
      const result = findNodeById(draft, selectedNodeId);
      if (result && result.node.componentes !== undefined) {
        groupCount++;
        const nome = `Grupo ${type === 'serie' ? 'Série' : 'Paralelo'} ${groupCount}`;
        const novoGrupo = type === 'serie' ? new GrupoSerie(nome) : new GrupoParalelo(nome);
        result.node.componentes.push(novoGrupo);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedNodeId || selectedNodeId === circuito.id) {
      alert("Não é possível excluir o nó raiz.");
      return;
    }
    updateCircuito(draft => {
      const result = findNodeById(draft, selectedNodeId);
      if (result && result.parent) {
        result.parent.componentes = result.parent.componentes.filter(c => c.id !== selectedNodeId);
      }
    });
    setSelectedNodeId(circuito.id);
  };

  const handleResolver = () => {
    try {
      const circuitoResolvido = produce(circuito, draft => {
        const c = new Circuito(tensao, draft);
        c.resolver();
      });
      const cReport = new Circuito(tensao, circuitoResolvido);
      setRelatorio(cReport.gerar_relatorio_texto());
      setTutorialText(cReport.gerar_tutorial_completo());
      setShowTutorial(true);
    } catch (e) {
      alert(`Erro ao resolver o circuito: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleExport = () => {
    const rows: CsvRow[] = []; // CORRIGIDO: de any[] para CsvRow[]
    const collectData = (componente: Componente, parentId: string | null) => {
      rows.push({
        id: componente.id,
        parent_id: parentId,
        type: componente.constructor.name,
        identifier: componente.identificador,
        value: (componente instanceof Resistor) ? componente.resistencia_ohm : ''
      });
      componente.componentes.forEach(c => collectData(c, componente.id));
    };
    collectData(circuito, null);
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'circuito.csv';
    link.click();
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    Papa.parse(event.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<CsvRow>) => { // CORRIGIDO: tipagem do results
        const data = results.data; // Agora 'data' é inferido como CsvRow[]
        const nodeMap = new Map<string, Componente>();
        let rootNode: Componente | null = null; // Explicitly typed as Componente | null

        data.forEach(row => {
          let comp: Componente;
          if (row.type === 'Resistor') {
            comp = new Resistor(row.identifier, Number(row.value));
          } else if (row.type === 'GrupoSerie') {
            comp = new GrupoSerie(row.identifier);
          } else if (row.type === 'GrupoParalelo') {
            comp = new GrupoParalelo(row.identifier);
          } else return;
          comp.id = row.id;
          nodeMap.set(row.id, comp);
        });

        data.forEach(row => {
          const parentId = row.parent_id;
          if (parentId && parentId !== 'null' && nodeMap.has(parentId)) {
            const parent = nodeMap.get(parentId)!;
            const child = nodeMap.get(row.id)!;
            parent.componentes.push(child);
          } else {
            rootNode = nodeMap.get(row.id)!;
          }
        });

        if (rootNode) {
          setCircuito(rootNode);
          if (rootNode) {
            if (rootNode) {
              setSelectedNodeId(rootNode);
            }
          }
        } else alert("Erro: Não foi possível encontrar o nó raiz no CSV.");
      }
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {showTutorial && <TutorialModal texto={tutorialText} onClose={() => setShowTutorial(false)} />}
      <Ferramentas {...{ onAddResistor: handleAddResistor, onAddGrupoSerie: () => handleAddGrupo('serie'), onAddGrupoParalelo: () => handleAddGrupo('paralelo'), onDelete: handleDelete, onImport: handleImport, onExport: handleExport, isNodeSelected: !!selectedNodeId }} />
      <main className="flex-1 flex flex-col p-4 gap-4">
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden min-h-0">
          <EstruturaCircuito circuito={circuito} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        </div>
        <div className="flex-1 bg-gray-800 rounded-lg min-h-0">
          <Diagrama circuito={circuito} />
        </div>
      </main>
      <Resultados {...{ tensao, setTensao, onResolver: handleResolver, relatorio }} />
    </div>
  );
}