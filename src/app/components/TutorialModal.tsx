// src/app/components/TutorialModal.tsx
'use client';

export default function TutorialModal({ texto, onClose }: { texto: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-white">Passo a Passo da Resolução</h2>
        <textarea
          className="w-full h-96 bg-gray-900 p-3 rounded border border-gray-600 font-mono text-sm text-gray-200"
          readOnly
          value={texto}
        />
        <div className="flex justify-end">
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 font-bold text-white">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}