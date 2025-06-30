// src/app/components/Ferramentas.tsx
'use client';
import { Download, PlusCircle, Trash2, Upload } from 'lucide-react';
import { ChangeEvent } from 'react';

type FerramentasProps = {
  onAddResistor: () => void;
  onAddGrupoSerie: () => void;
  onAddGrupoParalelo: () => void;
  onDelete: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  isNodeSelected: boolean;
};

const Button = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick: () => void, className?: string }) => (
  <button onClick={onClick} className={`flex items-center justify-center w-full px-4 py-2 my-1 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 transition-colors ${className}`}>
    {children}
  </button>
);

export default function Ferramentas(props: FerramentasProps) {
  return (
    <aside className="w-60 bg-gray-800 p-4 flex flex-col space-y-4">
      <h2 className="text-xl font-bold text-center text-white">Ferramentas</h2>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">COMPONENTES</h3>
        <Button onClick={props.onAddResistor}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Resistor</Button>
        <Button onClick={props.onAddGrupoSerie}><PlusCircle className="mr-2 h-4 w-4" /> Criar Grupo Série</Button>
        <Button onClick={props.onAddGrupoParalelo}><PlusCircle className="mr-2 h-4 w-4" /> Criar Grupo Paralelo</Button>
      </div>

      <div>
        <Button onClick={props.onDelete} className={!props.isNodeSelected ? 'bg-red-900 text-gray-500' : 'bg-red-600 hover:bg-red-700'}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir Selecionado
        </Button>
      </div>

      <div className="pt-4 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">ARQUIVO</h3>
        <input type="file" accept=".csv" onChange={props.onImport} style={{ display: 'none' }} id="import-csv" />
        <label htmlFor="import-csv" className="flex items-center justify-center w-full px-4 py-2 my-1 text-sm font-medium text-white bg-cyan-700 rounded-md hover:bg-cyan-600 transition-colors cursor-pointer">
          <Upload className="mr-2 h-4 w-4" /> Importar de CSV
        </label>
        <Button onClick={props.onExport} className="bg-cyan-700 hover:bg-cyan-600">
          <Download className="mr-2 h-4 w-4" /> Exportar para CSV
        </Button>
      </div>
    </aside>
  );
}