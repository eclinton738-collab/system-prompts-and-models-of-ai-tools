import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-acl flex min-h-[80vh] flex-col items-center justify-center py-20 text-center">
      <p className="display text-[9rem] leading-none text-red sm:text-[14rem]">404</p>
      <h1 className="text-4xl sm:text-5xl">Counted out</h1>
      <p className="mt-3 max-w-md text-fog">That page does not exist or has been moved. Head back to the action.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-red">Home</Link>
        <Link href="/events" className="btn btn-ghost">Events</Link>
        <Link href="/fighters" className="btn btn-ghost">Fighters</Link>
        <Link href="/search" className="btn btn-ghost">Search</Link>
      </div>
    </main>
  );
}
