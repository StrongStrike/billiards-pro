"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { getStoredAuthToken, setStoredAuthToken } from "@/lib/client/auth";
import { ApiError, isExternalApiMode, loginRequest, requestJson } from "@/lib/client/api";
import type { BootstrapPayload } from "@/types/club";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm<LoginFormValues>();

  useEffect(() => {
    let active = true;

    async function resolve() {
      if (isExternalApiMode() && !getStoredAuthToken()) {
        return;
      }

      try {
        await requestJson<BootstrapPayload>("/api/bootstrap");
        if (active) {
          router.replace("/dashboard");
        }
      } catch (issue) {
        if (
          issue instanceof ApiError &&
          issue.status === 401 &&
          isExternalApiMode()
        ) {
          return;
        }
      }
    }

    resolve();

    return () => {
      active = false;
    };
  }, [router]);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setError(null);
      try {
        const payload = await loginRequest(values.email, values.password);
        if (payload.token) {
          setStoredAuthToken(payload.token);
        }

        router.replace("/dashboard");
        router.refresh();
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Kirish amalga oshmadi");
        return;
      }
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="relative overflow-hidden p-8 md:p-10">
          <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-200">
              <Sparkles className="h-4 w-4" />
              Premium boshqaruv paneli
            </div>
            <h1 className="mt-8 max-w-2xl font-display text-5xl font-bold leading-tight text-white">
              Rus billiard stollari uchun professional boshqaruv paneli
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              Neon dashboard, jonli stol monitoringi, bronlar, bar buyurtmalar, ombor va aniq
              hisobotlar. Interfeys to&#39;liq Uzbek Latin va operatsion boshqaruv uchun tayyor.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                { title: "7 stol", hint: "5 oddiy + 2 VIP" },
                { title: "Jonli billing", hint: "Minut bo'yicha hisob" },
                { title: "PostgreSQL auth", hint: "Vercel + cPanel arxitekturasi" },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                  <div className="font-display text-2xl font-bold text-white">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-400">{item.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col justify-center p-8 md:p-10">
          <div className="w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="mt-6 font-display text-3xl font-bold text-white">Operator kirishi</div>
          <p className="mt-3 text-sm text-slate-400">
            PostgreSQL bazasidagi operator akkaunti bilan kiring. Agar tizim sozlanmagan
            bo&#39;lsa, server konfiguratsiyasi xabari shu yerda ko&#39;rsatiladi.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Email</label>
              <Input type="email" placeholder="admin@billiards.uz" {...register("email")} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Parol</label>
              <Input type="password" placeholder="********" {...register("password")} />
            </div>
            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            <Button type="submit" className="w-full justify-center" disabled={pending}>
              {pending ? "Kirilmoqda..." : "Tizimga kirish"}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
