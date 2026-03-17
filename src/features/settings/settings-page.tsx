"use client";

import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { patchJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { MetricCard, SectionHeader } from "@/features/shared";

type SettingsFormValues = {
  clubName: string;
  operatorName: string;
  operatorEmail: string;
  currency: string;
  timezone: string;
  standardHourlyRate: number;
  vipHourlyRate: number;
  showActivityChart: boolean;
  showRightRail: boolean;
  tables: Array<{ id: string; name: string; type: "standard" | "vip" }>;
};

const currencyOptions = ["UZS", "USD", "RUB"];
const timezoneOptions = ["Asia/Tashkent", "Asia/Samarkand", "Asia/Almaty", "Europe/Moscow"];

export function SettingsPage() {
  const bootstrapQuery = useBootstrapQuery();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, control, handleSubmit, reset } = useForm<SettingsFormValues>();
  const { fields } = useFieldArray({ control, name: "tables" });

  useEffect(() => {
    if (bootstrapQuery.data) {
      reset({
        ...bootstrapQuery.data.settings,
        tables: bootstrapQuery.data.tables.map((table) => ({
          id: table.id,
          name: table.name,
          type: table.type,
        })),
      });
    }
  }, [bootstrapQuery.data, reset]);

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { settings, tables } = bootstrapQuery.data;

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Sozlamalar"
        title="Klub sozlamalari"
        description="Akkount, valyuta, timezone, tariflar, dashboard ko'rinishi va 7 ta stol konfiguratsiyasi."
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><MetricCard label="Valyuta" value={settings.currency} accent="cyan" hint="Asosiy hisob-kitob birligi" /></StaggerItem>
        <StaggerItem>
          <MetricCard
            label="Oddiy stol"
            value={`${settings.standardHourlyRate.toLocaleString("uz-UZ")}`}
            accent="green"
            hint="Soatlik tarif"
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            label="VIP stol"
            value={`${settings.vipHourlyRate.toLocaleString("uz-UZ")}`}
            accent="amber"
            hint="Soatlik tarif"
          />
        </StaggerItem>
        <StaggerItem><MetricCard label="Stollar" value={`${tables.length}`} accent="slate" hint={settings.timezone} /></StaggerItem>
      </Stagger>

      <form
        className="space-y-5"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            setNotice(null);
            try {
              await patchJson<{ ok: true }>("/api/settings", values);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Sozlamalar saqlanmadi");
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
            setNotice("Sozlamalar muvaffaqiyatli saqlandi");
          }),
        )}
        >
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <Panel tone="cyan" className="hud-frame">
            <div className="flex items-center justify-between">
              <div className="font-display text-2xl font-bold text-white">Asosiy parametrlar</div>
              <SlidersHorizontal className="h-5 w-5 text-cyan-200" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-400">Klub nomi</label>
                <Input {...register("clubName")} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Operator</label>
                <Input {...register("operatorName")} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Operator email</label>
                <Input type="email" {...register("operatorEmail")} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Valyuta</label>
                <Select {...register("currency")}>
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Timezone</label>
                <Select {...register("timezone")}>
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">Oddiy stol soat narxi</label>
                <Input type="number" {...register("standardHourlyRate", { valueAsNumber: true })} />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-400">VIP stol soat narxi</label>
                <Input type="number" {...register("vipHourlyRate", { valueAsNumber: true })} />
              </div>
            </div>
            </Panel>
          </Reveal>

          <Reveal>
            <Panel tone="slate" className="hud-frame">
            <div className="font-display text-2xl font-bold text-white">Dashboard ko&#39;rinishi</div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="sheen-surface rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">Aktivlik grafigi</div>
                    <div className="mt-2 text-sm leading-7 text-slate-400">
                      Dashboard o&#39;ng panelidagi live occupancy chart ko&#39;rinishi.
                    </div>
                  </div>
                  <span className="relative mt-1 inline-flex items-center">
                    <input type="checkbox" className="peer sr-only" {...register("showActivityChart")} />
                    <span className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-cyan-300/80" />
                    <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                  </span>
                </div>
              </label>
              <label className="sheen-surface rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">O&#39;ng panel</div>
                    <div className="mt-2 text-sm leading-7 text-slate-400">
                      Yaqin bronlar, KPI va dinamik modul bloklarini ko&#39;rsatadi.
                    </div>
                  </div>
                  <span className="relative mt-1 inline-flex items-center">
                    <input type="checkbox" className="peer sr-only" {...register("showRightRail")} />
                    <span className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-cyan-300/80" />
                    <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
                  </span>
                </div>
              </label>
            </div>
            </Panel>
          </Reveal>
        </div>

        <Reveal>
          <Panel tone="green" className="hud-frame">
          <div className="font-display text-2xl font-bold text-white">Stollar konfiguratsiyasi</div>
          <div className="mt-4 space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="sheen-surface grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.04] p-4 md:grid-cols-[1fr_180px]"
              >
                <Input {...register(`tables.${index}.name`)} />
                <Select {...register(`tables.${index}.type`)}>
                  <option value="standard">Oddiy</option>
                  <option value="vip">VIP</option>
                </Select>
              </div>
            ))}
          </div>
          </Panel>
        </Reveal>

        <div className="space-y-4">
          {notice ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
              {notice}
            </div>
          ) : null}

          <Button type="submit" className="w-full justify-center" size="lg" disabled={pending}>
            {pending ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
          </Button>
        </div>
      </form>
    </div>
  );
}
