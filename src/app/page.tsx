// src/app/page.tsx
'use client';


import { produce } from 'immer';
import Papa from 'papaparse';
import { ChangeEvent, useState } from 'react';
import Diagrama from './components/Diagrama';
import EstruturaCircuito from './components/EstruturaCircuito';
import Ferramentas from './components/Ferramentas';
import Resultados from './components/Resultados';
import TutorialModal from './components/TutorialModal';
import { Circuito, Componente, GrupoParalelo, GrupoSerie, Resistor } from './lib/circuit-logic';

// Função utilitária para encontrar um nó na árvore
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
        result.parent.componentes = result.parent.componentes.filter((c: { id: string; }) => c.id !== selectedNodeId);
      }
    });
    setSelectedNodeId(circuito.id);
  };

  const handleResolver = () => {
    try {
      // 1. Crie um novo estado "resolvido" executando a lógica de mutação DENTRO do produce.
      // O 'draft' é um proxy mutável do nosso estado 'circuito'.
      const circuitoResolvido = produce(circuito, draft => {
        // Passamos o draft para a nossa lógica existente, que pode agora
        // modificar o rascunho de forma segura.
        const c = new Circuito(tensao, draft);
        c.resolver();
      });

      // 2. Agora, use este novo objeto (que é imutável) para gerar os relatórios.
      // Não estamos mais modificando nada, apenas lendo os resultados.
      const cReport = new Circuito(tensao, circuitoResolvido);
      setRelatorio(cReport.gerar_relatorio_texto());
      setTutorialText(cReport.gerar_tutorial_completo());

      // 3. Mostra o modal do tutorial.
      setShowTutorial(true);

    } catch (e) {
      alert(`Erro ao resolver o circuito: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Funções de Import/Export
  const handleExport = () => {
    const rows: any[] = [];
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
      complete: (results) => {
        const data = results.data as any[];
        const nodeMap = new Map<string, Componente & { id: string }>();
        let rootNode: Componente | null = null;

        data.forEach(row => {
          let comp: Componente;
          const id = row.id;
          const identifier = row.identifier;
          if (row.type === 'Resistor') {
            comp = new Resistor(identifier, Number(row.value));
          } else if (row.type === 'GrupoSerie') {
            comp = new GrupoSerie(identifier);
          } else if (row.type === 'GrupoParalelo') {
            comp = new GrupoParalelo(identifier);
          } else {
            return;
          }
          comp.id = id;
          nodeMap.set(id, comp);
        });

        data.forEach(row => {
          const parentId = row.parent_id;
          if (parentId && nodeMap.has(parentId)) {
            const parent = nodeMap.get(parentId)!;
            const child = nodeMap.get(row.id)!;
            parent.componentes.push(child);
          } else {
            rootNode = nodeMap.get(row.id)!;
          }
        });

        if (rootNode) {
          setCircuito(rootNode);
          setSelectedNodeId((rootNode as Componente).id);
        } else {
          alert("Erro: Não foi possível encontrar o nó raiz no CSV.");
        }
      }
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {showTutorial && <TutorialModal texto={tutorialText} onClose={() => setShowTutorial(false)} />}

      <Ferramentas
        onAddResistor={handleAddResistor}
        onAddGrupoSerie={() => handleAddGrupo('serie')}
        onAddGrupoParalelo={() => handleAddGrupo('paralelo')}
        onDelete={handleDelete}
        onImport={handleImport}
        onExport={handleExport}
        isNodeSelected={!!selectedNodeId}
      />

      <main className="flex-1 flex flex-col p-4 gap-4">
        <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden min-h-0">
          <EstruturaCircuito circuito={circuito} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
        </div>
        <div className="flex-1 bg-gray-800 rounded-lg min-h-0">
          <Diagrama circuito={circuito} />
        </div>
      </main>

      <Resultados
        tensao={tensao}
        setTensao={setTensao}
        onResolver={handleResolver}
        relatorio={relatorio}
      />
    </div>
  );
}