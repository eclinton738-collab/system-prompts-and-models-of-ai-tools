export default function Loading() {
  return (
    <div className="container-acl py-10" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-2/3 max-w-md animate-pulse bg-steel" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-44 animate-pulse bg-coal" />)}
      </div>
    </div>
  );
}
