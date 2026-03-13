"use client";

import { useEffect, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { patchJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { SectionHeader } from "@/features/shared";

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

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Sozlamalar"
        title="Klub sozlamalari"
        description="Akkount, valyuta, timezone, tariflar, dashboard ko'rinishi va 7 ta stol konfiguratsiyasi."
      />

      <Panel>
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl font-bold text-white">Asosiy parametrlar</div>
          <SlidersHorizontal className="h-5 w-5 text-cyan-200" />
        </div>
        <form
          className="mt-6 space-y-6"
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
          <div className="grid gap-4 md:grid-cols-2">
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
              <Input {...register("currency")} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Timezone</label>
              <Input {...register("timezone")} />
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

          <div className="grid gap-4 rounded-[24px] border border-white/8 bg-white/[0.04] p-4 md:grid-cols-2">
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" className="h-4 w-4" {...register("showActivityChart")} />
              Aktivlik grafigi ko&#39;rsatilsin
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" className="h-4 w-4" {...register("showRightRail")} />
              O&#39;ng panel ko&#39;rsatilsin
            </label>
          </div>

          <div>
            <div className="font-display text-2xl font-bold text-white">Stollar konfiguratsiyasi</div>
            <div className="mt-4 space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.04] p-4 md:grid-cols-[1fr_180px]"
                >
                  <Input {...register(`tables.${index}.name`)} />
                  <select
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    {...register(`tables.${index}.type`)}
                  >
                    <option value="standard">Oddiy</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {notice ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
              {notice}
            </div>
          ) : null}

          <Button type="submit" className="w-full justify-center" disabled={pending}>
            {pending ? "Saqlanmoqda..." : "Sozlamalarni saqlash"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
