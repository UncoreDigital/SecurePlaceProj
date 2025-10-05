'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Safety Classes Page Error:', error);
  }, [error]);

  return (
    <div className="container mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg mx-auto">
        <h2 className="text-red-800 font-semibold mb-2 text-lg">
          Unable to load safety classes
        </h2>
        <p className="text-red-600 mb-4">
          We're experiencing technical difficulties loading the safety classes.
        </p>
        <div className="space-y-2">
          <Button 
            onClick={reset}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}