import { useState, useEffect, ReactNode } from 'react';
import { Key } from 'lucide-react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function ApiKeyGuard({ children }: { children: ReactNode }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const result = await window.aistudio.hasSelectedApiKey();
        setHasKey(result);
      } else {
        // Fallback for local dev if window.aistudio is not available
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success to mitigate race condition
      setHasKey(true);
    }
  };

  if (hasKey === null) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50">Loading...</div>;
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
            <Key className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">API Key Required</h1>
            <p className="text-zinc-400 text-sm">
              This application uses Veo video generation models which require a paid Google Cloud project API key.
            </p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium rounded-xl transition-colors"
          >
            Select API Key
          </button>
          <p className="text-xs text-zinc-500">
            Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-zinc-300">billing</a>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
