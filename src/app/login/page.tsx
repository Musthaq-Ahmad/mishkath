import Image from "next/image";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center p-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <main className="card-elevated relative flex min-h-[600px] w-full max-w-[1000px] flex-col overflow-hidden rounded-xl bg-card md:flex-row">
        <section className="relative hidden flex-col items-center justify-center overflow-hidden bg-linear-to-br from-primary to-[#1e1b4b] p-12 text-center text-primary-foreground md:flex md:w-5/12">
          <div className="relative z-10 flex flex-col items-center">
            <span className="material-symbols-outlined mb-8 text-[120px] text-gold opacity-90">
              light
            </span>
            <h2 className="mb-4 font-heading text-3xl font-semibold text-gold">
              Niche of Light
            </h2>
            <p className="max-w-xs text-base leading-relaxed text-primary-foreground/80">
              Illuminating the path for world-class festival management
              through clarity, guidance, and heritage.
            </p>
          </div>
        </section>

        <section className="flex w-full flex-col justify-center bg-card p-8 md:w-7/12 md:p-16">
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="overflow-hidden rounded-full bg-white ring-1 ring-border">
              <Image
                src="/mishkat-icon.png"
                alt="MISHKAT"
                width={80}
                height={80}
                className="size-20 object-cover"
              />
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">
              MISHKAT
            </h1>
            <p className="-mt-1 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Festival Management
            </p>
          </div>

          <div className="animate-fade-in-up mx-auto w-full max-w-md">
            <h2 className="mb-2 font-heading text-2xl font-semibold">
              Welcome Back
            </h2>
            <p className="mb-8 text-sm text-muted-foreground">
              Please enter your credentials to access the festival dashboard.
            </p>
            <LoginForm />
          </div>
        </section>
      </main>
    </div>
  );
}
