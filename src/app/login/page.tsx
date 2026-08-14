import Image from "next/image";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center p-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <main className="card-elevated relative flex min-h-[600px] w-full max-w-[1000px] flex-col overflow-hidden rounded-xl bg-card md:flex-row">
        <section
          className="relative hidden flex-col justify-between overflow-hidden p-10 text-primary-foreground md:flex md:w-5/12"
          style={{ background: "linear-gradient(135deg, oklch(60% 0.2 30) 0%, oklch(48% 0.18 26) 100%)" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -bottom-16 size-80 rounded-full bg-gold/20 blur-[100px]"
          />

          <Image
            src="/mehfile-meem-logo-white.png"
            alt="Mehfile Meem — Meelad Fest 2K26"
            width={280}
            height={167}
            className="relative z-10 h-auto w-[280px]"
            priority
          />

          <div className="relative z-10 max-w-xs">
            <h1 className="mb-4 font-heading text-3xl leading-tight font-bold text-primary-foreground">
              Illuminating the path through clarity, guidance, and heritage
            </h1>
            <p className="text-sm leading-relaxed text-primary-foreground/80">
              Mehfile Meem Festival Admin Portal. Manage events, participants, and
              live scoring with precision and elegance.
            </p>
          </div>
        </section>

        <section className="flex w-full flex-col justify-center bg-card p-8 md:w-7/12 md:p-16">
          <div className="mb-8 flex flex-col items-center gap-2 md:items-start">
            <Image
              src="/mehfile-meem-logo-indigo.png"
              alt="Mehfile Meem — Meelad Fest 2K26"
              width={220}
              height={131}
              className="h-auto w-[220px]"
              priority
            />
            <p className="text-sm text-muted-foreground">
              Sign in to access the festival admin dashboard.
            </p>
          </div>

          <div className="animate-fade-in-up mx-auto w-full max-w-md md:mx-0">
            <LoginForm />
            <div className="mt-8 border-t border-border pt-4 text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                Need support? Contact <span className="font-medium text-primary">IT Admin</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
