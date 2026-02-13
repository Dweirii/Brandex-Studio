"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <div className="flex h-screen flex-col items-center justify-center gap-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-sm text-white/50">
              A critical error occurred. Please try refreshing the page.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl bg-[#00EB02] px-6 py-3 text-sm font-semibold text-black"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
