"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen px-5 py-10">
          <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
            <div className="hero-panel text-center">
              <p className="eyebrow">Workspace interrupted</p>
              <h1 className="title-hero mt-5 text-5xl">Relay hit a temporary problem.</h1>
              <p className="copy-strong mt-4">Your saved workspace is safe. Retry this screen, or refresh if the problem continues.</p>
              <button type="button" className="relay-button mt-6" onClick={reset}>Try again</button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
