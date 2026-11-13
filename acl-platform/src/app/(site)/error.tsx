"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-acl py-20 text-center">
      <p className="eyebrow mb-2">Something went wrong</p>
      <h1 className="text-5xl">We dropped our guard</h1>
      <p className="mx-auto mt-3 max-w-md text-fog">This page failed to load. Try again — if it keeps happening, the team has been notified{error.digest ? ` (ref ${error.digest})` : ""}.</p>
      <button type="button" onClick={reset} className="btn btn-red mt-6">Try again</button>
    </div>
  );
}
