// src/app/components/Resultados.tsx
'use client';

type ResultadosProps = {
  tensao: number;
  setTensao: (t: number) => void;
  onResolver: () => void;
  relatorio: string;
}

export default function Resultados({ tensao, setTensao, onResolver, relatorio }: ResultadosProps) {
  return (
    <aside className="w-80 bg-gray-800 p-4 flex flex-col">
      <h2 className="text-xl font-bold text-center text-white mb-4">Controle e Resultados</h2>

      <div className="mb-4">
        <label htmlFor="tensao" className="block text-sm font-medium text-gray-300 mb-1">Tensão da Fonte (V)</label>
        <input
          id="tensao"
          type="number"
          value={tensao}
          onChange={(e) => setTensao(Number(e.target.value))}
          className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      <button onClick={onResolver} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-md font-bold mb-4">
        Resolver e Desenhar
      </button>

      <textarea
        readOnly
        value={relatorio}
        className="flex-1 w-full bg-gray-900 p-2 rounded-md border border-gray-600 font-mono text-xs"
        placeholder="Os resultados aparecerão aqui..."
      />
    </aside>
  );
}