import Image from "next/image";

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center text-foreground">
      <Image
        src="/mehfile-meem-icon.png"
        alt="Mehfile Meem"
        width={96}
        height={85}
        className="h-auto w-20 opacity-80"
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page hasn&apos;t been loaded yet, so it isn&apos;t available without a
          connection. Reconnect and try again.
        </p>
      </div>
    </div>
  );
}
