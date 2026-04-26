"use client";
import { AssetPieChart } from "@/components/charts/AssetPieChart";
import { SummaryCards } from "@/components/charts/SummaryCards";
import { CashflowChart, YearlyComparisonTable } from "@/components/charts/CashflowChart";
import { BucketsOverview } from "@/components/charts/BucketsOverview";
import { DashboardInsights } from "@/components/charts/DashboardInsights";
import { DashboardAiConsole } from "@/components/charts/DashboardAiConsole";
import { AccountsOverview } from "@/components/accounts/AccountsOverview";
import { SpendingCategoryExplorer } from "@/components/charts/SpendingCategoryExplorer";
import { DashboardCalendarHeatmap } from "@/components/charts/DashboardCalendarHeatmap";
import { DashboardEditorialSummary } from "@/components/charts/DashboardEditorialSummary";
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
          <DashboardEditorialSummary />

          <DashboardInsights />

          <DashboardAiConsole />

          {/* Section 0: Accounts / Net Worth */}
          <AccountsOverview />

          {/* Section 1: Summary Cards */}
          <SummaryCards />

          <SpendingCategoryExplorer />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BucketsOverview />
            <DashboardCalendarHeatmap />
          </div>

          <AssetPieChart />

          {/* Section 3: Cashflow Chart */}
          <CashflowChart />

          {/* Section 4: Yearly Comparison Table */}
          <YearlyComparisonTable />
        </>
      )}
    </div>
  );
}
