"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  CircleGauge,
  LayoutDashboard,
  Mail,
  PenSquare,
  Rows3,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { ModalNote, ModalStat, ResponsiveModal } from "@/components/ui/responsive-modal";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/reveal";
import { Select } from "@/components/ui/select";
import { ModalDismissButton, useToast } from "@/components/ui/modal-provider";
import { patchJson } from "@/lib/client/api";
import { useBootstrapQuery } from "@/lib/hooks/use-club-data";
import { MetricCard, SectionHeader } from "@/features/shared";
import type { TableType } from "@/types/club";

type SettingsModal = "club" | "operator" | "pricing" | "display" | "tables" | null;
type TableDraft = { id: string; name: string; type: TableType };

const currencyOptions = ["UZS", "USD", "RUB"];
const timezoneOptions = ["Asia/Tashkent", "Asia/Samarkand", "Asia/Almaty", "Europe/Moscow"];

function SettingsOverviewCard({
  icon,
  eyebrow,
  title,
  description,
  summary,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  summary: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Panel tone="slate" className="hud-frame">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-cyan-200">
          {icon}
        </div>
        <Button variant="secondary" className="gap-2" onClick={onAction}>
          <PenSquare className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>

      <div className="mt-5 text-xs uppercase tracking-[0.24em] text-cyan-300/70">{eyebrow}</div>
      <div className="mt-2 font-display text-2xl font-bold text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-400">{description}</div>

      <div className="mt-5 space-y-3">{summary}</div>
    </Panel>
  );
}

function SettingsSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.035] px-4 py-3">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-right font-semibold text-white">{value}</div>
    </div>
  );
}

function SwitchField({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-white">{title}</div>
          <div className="mt-2 text-sm leading-7 text-slate-400">{description}</div>
        </div>
        <span className="relative mt-1 inline-flex items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-cyan-300/80" />
          <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
        </span>
      </div>
    </label>
  );
}

export function SettingsPage() {
  const bootstrapQuery = useBootstrapQuery();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [modal, setModal] = useState<SettingsModal>(null);
  const [pending, startTransition] = useTransition();

  const [clubName, setClubName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Tashkent");
  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [currency, setCurrency] = useState("UZS");
  const [standardHourlyRate, setStandardHourlyRate] = useState("");
  const [vipHourlyRate, setVipHourlyRate] = useState("");
  const [showActivityChart, setShowActivityChart] = useState(true);
  const [showRightRail, setShowRightRail] = useState(true);
  const [tableDrafts, setTableDrafts] = useState<TableDraft[]>([]);

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { settings, tables } = bootstrapQuery.data;
  const clubDirty = clubName !== settings.clubName || timezone !== settings.timezone;
  const operatorDirty =
    operatorName !== settings.operatorName || operatorEmail !== settings.operatorEmail;
  const pricingDirty =
    currency !== settings.currency ||
    Number(standardHourlyRate || 0) !== settings.standardHourlyRate ||
    Number(vipHourlyRate || 0) !== settings.vipHourlyRate;
  const displayDirty =
    showActivityChart !== settings.showActivityChart || showRightRail !== settings.showRightRail;
  const tablesDirty =
    tableDrafts.length !== tables.length ||
    tableDrafts.some((draft, index) => {
      const source = tables[index];
      return !source || source.id !== draft.id || source.name !== draft.name || source.type !== draft.type;
    });

  function closeModal() {
    setModal(null);
  }

  function openClubModal() {
    setClubName(settings.clubName);
    setTimezone(settings.timezone);
    setModal("club");
  }

  function openOperatorModal() {
    setOperatorName(settings.operatorName);
    setOperatorEmail(settings.operatorEmail);
    setModal("operator");
  }

  function openPricingModal() {
    setCurrency(settings.currency);
    setStandardHourlyRate(String(settings.standardHourlyRate));
    setVipHourlyRate(String(settings.vipHourlyRate));
    setModal("pricing");
  }

  function openDisplayModal() {
    setShowActivityChart(settings.showActivityChart);
    setShowRightRail(settings.showRightRail);
    setModal("display");
  }

  function openTablesModal() {
    setTableDrafts(
      tables.map((table) => ({
        id: table.id,
        name: table.name,
        type: table.type,
      })),
    );
    setModal("tables");
  }

  function updateDraftTable(tableId: string, patch: Partial<TableDraft>) {
    setTableDrafts((current) =>
      current.map((table) => (table.id === tableId ? { ...table, ...patch } : table)),
    );
  }

  function runSettingsUpdate(
    payload: Record<string, unknown>,
    successTitle: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      try {
        await patchJson<{ ok: true }>("/api/settings", payload);
        await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
        pushToast({
          title: successTitle,
          description: "Sozlamalar paneli yangi qiymatlar bilan yangilandi.",
          tone: "success",
        });
        onSuccess?.();
      } catch (error) {
        pushToast({
          title: "Sozlamalarni saqlab bo'lmadi",
          description: error instanceof Error ? error.message : "Noma'lum xatolik yuz berdi",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Sozlamalar"
        title="Klub konfiguratsiyasi"
        description="Uzun formani olib tashladik. Endi sozlamalar bo'limi overview kartalaridan iborat va har bir bo'lim alohida premium modal ichida tahrirlanadi."
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><MetricCard label="Valyuta" value={settings.currency} accent="cyan" hint="Asosiy hisob-kitob birligi" /></StaggerItem>
        <StaggerItem><MetricCard label="Oddiy tarif" value={`${settings.standardHourlyRate.toLocaleString("uz-UZ")}`} accent="green" hint="Soatlik tarif" /></StaggerItem>
        <StaggerItem><MetricCard label="VIP tarif" value={`${settings.vipHourlyRate.toLocaleString("uz-UZ")}`} accent="amber" hint="Soatlik tarif" /></StaggerItem>
        <StaggerItem><MetricCard label="Stollar" value={`${tables.length}`} accent="slate" hint={settings.timezone} /></StaggerItem>
      </Stagger>

      <div className="grid gap-5 xl:grid-cols-2">
        <Reveal>
          <SettingsOverviewCard
            icon={<Building2 className="h-5 w-5" />}
            eyebrow="Club profile"
            title="Klub profili"
            description="Nom va asosiy vaqt zonasi. Bu qiymatlar dashboard va rezervatsiya vaqtlarini boshqaradi."
            actionLabel="Profilni tahrirlash"
            onAction={openClubModal}
            summary={
              <>
                <SettingsSummaryRow label="Klub nomi" value={settings.clubName} />
                <SettingsSummaryRow label="Timezone" value={settings.timezone} />
              </>
            }
          />
        </Reveal>

        <Reveal>
          <SettingsOverviewCard
            icon={<UserRound className="h-5 w-5" />}
            eyebrow="Operator"
            title="Operator akkaunti"
            description="Asosiy operator nomi va emaili. Auth va UI identity shu yerdan ko'rsatiladi."
            actionLabel="Akkauntni tahrirlash"
            onAction={openOperatorModal}
            summary={
              <>
                <SettingsSummaryRow label="Operator" value={settings.operatorName} />
                <SettingsSummaryRow label="Email" value={settings.operatorEmail} />
              </>
            }
          />
        </Reveal>

        <Reveal>
          <SettingsOverviewCard
            icon={<CircleGauge className="h-5 w-5" />}
            eyebrow="Pricing"
            title="Tarif va valyuta"
            description="Oddiy/VIP soat narxi va hisob-kitob valyutasi shu blokdan boshqariladi."
            actionLabel="Tariflarni ochish"
            onAction={openPricingModal}
            summary={
              <>
                <SettingsSummaryRow label="Valyuta" value={settings.currency} />
                <SettingsSummaryRow label="Oddiy stol" value={`${settings.standardHourlyRate.toLocaleString("uz-UZ")} / soat`} />
                <SettingsSummaryRow label="VIP stol" value={`${settings.vipHourlyRate.toLocaleString("uz-UZ")} / soat`} />
              </>
            }
          />
        </Reveal>

        <Reveal>
          <SettingsOverviewCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            eyebrow="Dashboard"
            title="Ko'rinish modullari"
            description="Dashboard o'ng paneli va live activity chart ko'rinishi shu yerda yoqiladi yoki o'chiriladi."
            actionLabel="Display settings"
            onAction={openDisplayModal}
            summary={
              <>
                <SettingsSummaryRow
                  label="Aktivlik grafigi"
                  value={settings.showActivityChart ? "Yoqilgan" : "O'chirilgan"}
                />
                <SettingsSummaryRow
                  label="O'ng panel"
                  value={settings.showRightRail ? "Ko'rsatiladi" : "Yashirilgan"}
                />
              </>
            }
          />
        </Reveal>
      </div>

      <Reveal>
        <SettingsOverviewCard
          icon={<Rows3 className="h-5 w-5" />}
          eyebrow="Tables"
          title="Stollar konfiguratsiyasi"
          description="7 ta rus billiard stoli nomi va turi. Shu bo'lim orqali floor model tartibga keltiriladi."
          actionLabel="Stollarni boshqarish"
          onAction={openTablesModal}
          summary={
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tables.map((table) => (
                <SettingsSummaryRow
                  key={table.id}
                  label={table.name}
                  value={table.type === "vip" ? "VIP" : "Oddiy"}
                />
              ))}
            </div>
          }
        />
      </Reveal>

      <ResponsiveModal
        open={modal === "club"}
        onClose={closeModal}
        title="Klub profili"
        description="Klub nomi va timezone butun tizimdagi vaqt ko'rinishiga ta'sir qiladi."
        tone="cyan"
        size="md"
        icon={<Building2 className="h-5 w-5" />}
        closeGuard={{ when: clubDirty }}
        hotkeys={[
          {
            key: "s",
            ctrlOrMeta: true,
            allowInInput: true,
            label: "Klub profilini saqlash",
            action: () =>
              runSettingsUpdate(
                { clubName, timezone },
                "Klub profili yangilandi",
                closeModal,
              ),
          },
        ]}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ModalDismissButton variant="secondary" disabled={pending}>
              Yopish
            </ModalDismissButton>
            <Button
              onClick={() =>
                runSettingsUpdate(
                  { clubName, timezone },
                  "Klub profili yangilandi",
                  closeModal,
                )
              }
              disabled={pending}
            >
              {pending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ModalStat label="Joriy klub nomi" value={settings.clubName} hint="Header va branding" />
            <ModalStat label="Joriy timezone" value={settings.timezone} hint="Report va bron vaqtlari" />
          </div>
          <ModalNote tone="cyan">
            Timezone noto&#39;g&#39;ri bo&#39;lsa, bronlar, hisobotlar va live clock noto&#39;g&#39;ri kun yoki soatga tushib qoladi.
          </ModalNote>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Klub nomi</label>
              <Input value={clubName} onChange={(event) => setClubName(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Timezone</label>
              <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                {timezoneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={modal === "operator"}
        onClose={closeModal}
        title="Operator akkaunti"
        description="Asosiy operator identifikatori dashboard va auth qismida ko'rsatiladi."
        tone="green"
        size="md"
        icon={<Mail className="h-5 w-5" />}
        closeGuard={{ when: operatorDirty }}
        hotkeys={[
          {
            key: "s",
            ctrlOrMeta: true,
            allowInInput: true,
            label: "Operator profilini saqlash",
            action: () =>
              runSettingsUpdate(
                { operatorName, operatorEmail },
                "Operator akkaunti yangilandi",
                closeModal,
              ),
          },
        ]}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ModalDismissButton variant="secondary" disabled={pending}>
              Yopish
            </ModalDismissButton>
            <Button
              onClick={() =>
                runSettingsUpdate(
                  { operatorName, operatorEmail },
                  "Operator akkaunti yangilandi",
                  closeModal,
                )
              }
              disabled={pending}
            >
              {pending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ModalStat label="Operator" value={settings.operatorName} hint="UI identity" />
            <ModalStat label="Email" value={settings.operatorEmail} hint="Auth email" />
          </div>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Operator nomi</label>
              <Input value={operatorName} onChange={(event) => setOperatorName(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Operator email</label>
              <Input type="email" value={operatorEmail} onChange={(event) => setOperatorEmail(event.target.value)} />
            </div>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={modal === "pricing"}
        onClose={closeModal}
        title="Tarif va valyuta"
        description="Valyuta va soatlik narxlar billing, chek va hisobotlarda ishlatiladi."
        tone="amber"
        size="md"
        icon={<SlidersHorizontal className="h-5 w-5" />}
        closeGuard={{ when: pricingDirty }}
        hotkeys={[
          {
            key: "s",
            ctrlOrMeta: true,
            allowInInput: true,
            label: "Tariflarni saqlash",
            action: () =>
              runSettingsUpdate(
                {
                  currency,
                  standardHourlyRate: Number(standardHourlyRate),
                  vipHourlyRate: Number(vipHourlyRate),
                },
                "Tariflar yangilandi",
                closeModal,
              ),
          },
        ]}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ModalDismissButton variant="secondary" disabled={pending}>
              Yopish
            </ModalDismissButton>
            <Button
              onClick={() =>
                runSettingsUpdate(
                  {
                    currency,
                    standardHourlyRate: Number(standardHourlyRate),
                    vipHourlyRate: Number(vipHourlyRate),
                  },
                  "Tariflar yangilandi",
                  closeModal,
                )
              }
              disabled={pending}
            >
              {pending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModalStat label="Valyuta" value={settings.currency} hint="Asosiy birlik" />
            <ModalStat label="Oddiy tarif" value={`${settings.standardHourlyRate.toLocaleString("uz-UZ")}`} hint="Soatlik" />
            <ModalStat label="VIP tarif" value={`${settings.vipHourlyRate.toLocaleString("uz-UZ")}`} hint="Soatlik" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-400">Valyuta</label>
              <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">Oddiy stol narxi</label>
              <Input type="number" value={standardHourlyRate} onChange={(event) => setStandardHourlyRate(event.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-400">VIP stol narxi</label>
              <Input type="number" value={vipHourlyRate} onChange={(event) => setVipHourlyRate(event.target.value)} />
            </div>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={modal === "display"}
        onClose={closeModal}
        title="Dashboard display"
        description="Boshqaruv panelidagi live modul bloklarini yoqish va o'chirish."
        tone="slate"
        size="md"
        icon={<LayoutDashboard className="h-5 w-5" />}
        closeGuard={{ when: displayDirty }}
        hotkeys={[
          {
            key: "s",
            ctrlOrMeta: true,
            allowInInput: true,
            label: "Dashboard display-ni saqlash",
            action: () =>
              runSettingsUpdate(
                { showActivityChart, showRightRail },
                "Dashboard ko'rinishi yangilandi",
                closeModal,
              ),
          },
        ]}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ModalDismissButton variant="secondary" disabled={pending}>
              Yopish
            </ModalDismissButton>
            <Button
              onClick={() =>
                runSettingsUpdate(
                  { showActivityChart, showRightRail },
                  "Dashboard ko'rinishi yangilandi",
                  closeModal,
                )
              }
              disabled={pending}
            >
              {pending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ModalStat label="Aktivlik grafigi" value={settings.showActivityChart ? "Yoqilgan" : "O'chirilgan"} hint="Right rail chart" />
            <ModalStat label="O'ng panel" value={settings.showRightRail ? "Ko'rsatiladi" : "Yashirilgan"} hint="KPI va bron bloklari" />
          </div>
          <div className="grid gap-4">
            <SwitchField
              checked={showActivityChart}
              onChange={setShowActivityChart}
              title="Aktivlik grafigi"
              description="Dashboard o'ng panelidagi live occupancy chart ko'rinadi."
            />
            <SwitchField
              checked={showRightRail}
              onChange={setShowRightRail}
              title="O'ng panel"
              description="Yaqin bronlar, KPI va dinamik bloklar dashboardda ko'rsatiladi."
            />
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        open={modal === "tables"}
        onClose={closeModal}
        title="Stollar konfiguratsiyasi"
        description="7 ta stol nomi va turini bir joyda boshqaring. Bu yer floor model va billing tarifini belgilaydi."
        tone="green"
        size="lg"
        icon={<Rows3 className="h-5 w-5" />}
        closeGuard={{ when: tablesDirty }}
        hotkeys={[
          {
            key: "s",
            ctrlOrMeta: true,
            allowInInput: true,
            label: "Stollar konfiguratsiyasini saqlash",
            action: () =>
              runSettingsUpdate(
                { tables: tableDrafts },
                "Stollar konfiguratsiyasi yangilandi",
                closeModal,
              ),
          },
        ]}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ModalDismissButton variant="secondary" disabled={pending}>
              Yopish
            </ModalDismissButton>
            <Button
              onClick={() =>
                runSettingsUpdate(
                  { tables: tableDrafts },
                  "Stollar konfiguratsiyasi yangilandi",
                  closeModal,
                )
              }
              disabled={pending}
            >
              {pending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <ModalStat label="Jami stol" value={`${tables.length}`} hint="Rus billiard stollari" />
            <ModalStat label="Oddiy" value={`${tables.filter((table) => table.type === "standard").length}`} hint="Standart tarif" />
            <ModalStat label="VIP" value={`${tables.filter((table) => table.type === "vip").length}`} hint="Premium tarif" />
          </div>
          <ModalNote tone="green">
            Stol turini o&#39;zgartirish billing tarifiga ta&#39;sir qiladi. Nomlar esa dashboard va bronlar timeline ko&#39;rinishini yangilaydi.
          </ModalNote>
          <div className="space-y-3">
            {tableDrafts.map((table) => (
              <div
                key={table.id}
                className="grid gap-3 rounded-[22px] border border-white/8 bg-white/[0.04] p-4 md:grid-cols-[1fr_180px]"
              >
                <Input
                  value={table.name}
                  onChange={(event) => updateDraftTable(table.id, { name: event.target.value })}
                />
                <Select
                  value={table.type}
                  onChange={(event) => updateDraftTable(table.id, { type: event.target.value as TableType })}
                >
                  <option value="standard">Oddiy</option>
                  <option value="vip">VIP</option>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
