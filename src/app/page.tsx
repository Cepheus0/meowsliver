"use client";

import Link from "next/link";
import { AssetPieChart } from "@/components/charts/AssetPieChart";
import { SummaryCards } from "@/components/charts/SummaryCards";
import { CashflowChart, YearlyComparisonTable } from "@/components/charts/CashflowChart";
import { BucketsOverview } from "@/components/charts/BucketsOverview";
import { AccountsOverview } from "@/components/accounts/AccountsOverview";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { CalendarDays, DatabaseZap, FileSpreadsheet, Landmark } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { useTr } from "@/lib/i18n";

/**
 * Main Dashboard Page — เหมียวเงิน (MoneyCat Tracker)
 *
 * This is the primary screen showing:
 * 1. Summary stat cards (income, expense, net cashflow, savings rate)
 * 2. 100% Net Worth Asset Allocation Pie Chart (most important)
 * 3. Monthly Cashflow bar + line chart
 * 4. Yearly comparison table
 * 5. Savings Buckets overview
 */
export default function DashboardPage() {
  const { importedTransactions, selectedYear, accounts } = useFinanceStore();
  const tr = useTr();
  const hasTransactions = importedTransactions.length > 0;
  const activeAccounts = accounts.filter((account) => !account.isArchived).length;
  const txCount = importedTransactions.length.toLocaleString();

  return (
    <div className="space-y-6">
      <PageHeader
        className="animate-fade-slide-up anim-delay-0"
        eyebrow={tr("ภาพรวม", "Overview")}
        title={tr("แดชบอร์ด", "Dashboard")}
        description={tr(
          "ศูนย์กลางสำหรับดูเงินสดสุทธิ บัญชีที่ใช้งานอยู่ ความเคลื่อนไหวรายเดือน และความคืบหน้าของเป้าหมายในปีที่เลือก",
          "Your hub for net cash, active accounts, monthly activity, and goal progress for the selected year."
        )}
        meta={[
          {
            icon: <CalendarDays size={14} />,
            label: tr(`ปี ${selectedYear}`, `FY ${selectedYear}`),
            tone: "brand",
          },
          {
            icon: hasTransactions ? <DatabaseZap size={14} /> : <FileSpreadsheet size={14} />,
            label: hasTransactions
              ? tr(`${txCount} ธุรกรรมจริง`, `${txCount} real transactions`)
              : tr("ยังไม่มีธุรกรรมที่นำเข้า", "No transactions imported yet"),
            tone: hasTransactions ? "success" : "neutral",
          },
          {
            icon: <Landmark size={14} />,
            label: tr(
              `${activeAccounts.toLocaleString()} บัญชีใช้งาน`,
              `${activeAccounts.toLocaleString()} active accounts`
            ),
          },
        ]}
        actions={
          <>
            <Link
              href={hasTransactions ? "/transactions" : "/import"}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-sm font-medium text-[color:var(--app-text)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)]"
            >
              {hasTransactions
                ? tr("ดูรายการทั้งหมด", "View all transactions")
                : tr("เริ่มนำเข้าข้อมูล", "Start importing data")}
            </Link>
            <Link
              href="/accounts"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-brand)] bg-[color:var(--app-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_var(--app-brand-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)]"
            >
              {tr("จัดการบัญชี", "Manage accounts")}
            </Link>
          </>
        }
      />

      {!hasTransactions ? (
        <>
          <Card>
            <EmptyState
              icon={<FileSpreadsheet size={20} />}
              title={tr("ยังไม่มีข้อมูลธุรกรรมจริง", "No real transaction data yet")}
              description={tr(
                "แดชบอร์ดฝั่ง cashflow จะเริ่มแสดงผลทันทีเมื่อมีการนำเข้าธุรกรรมจริง แต่คุณยังสามารถสร้าง Savings Goals และติดตาม progress ได้เลย",
                "Cashflow charts start rendering as soon as real transactions are imported. You can still create Savings Goals and track progress right now."
              )}
              actionHref="/import"
              actionLabel={tr("เริ่มนำเข้าไฟล์", "Start importing")}
            />
          </Card>

          <AccountsOverview />

          <BucketsOverview />
        </>
      ) : (
        <>
          {/* Section 0: Accounts / Net Worth */}
          <AccountsOverview />

          {/* Section 1: Summary Cards */}
          <SummaryCards />

          {/* Section 2: Asset Allocation Pie + Status panel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <AssetPieChart />

            <Card className="flex flex-col justify-between">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  {tr("สถานะข้อมูล", "Data status")}
                </p>
                <EmptyState
                  className="border-0 bg-transparent px-0 py-0"
                  icon={<DatabaseZap size={20} />}
                  title={tr("ตอนนี้แอปใช้ข้อมูลจริงทั้งหมดแล้ว", "All data is live")}
                  description={tr(
                    `มีข้อมูลที่นำเข้าแล้ว ${importedTransactions.length} รายการ และกำลังแสดงผลตามปี ${selectedYear} ข้อมูลสินทรัพย์ หนี้สิน และการลงทุน ถูกเชื่อมโยงกับบัญชีจริงเรียบร้อยแล้ว`,
                    `${importedTransactions.length} transactions imported and rendering for FY ${selectedYear}. Assets, liabilities, and investments are all linked to real accounts.`
                  )}
                  actionHref="/transactions"
                  actionLabel={tr("ดูรายการทั้งหมด", "View all transactions")}
                />
              </div>
            </Card>
          </div>

          {/* Section 3: Cashflow Chart */}
          <CashflowChart />

          {/* Section 4: Yearly Comparison Table */}
          <YearlyComparisonTable />

          {/* Section 5: Savings Buckets */}
          <BucketsOverview />
        </>
      )}
    </div>
  );
}
