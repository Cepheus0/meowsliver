"use client";

import { AssetPieChart } from "@/components/charts/AssetPieChart";
import { SummaryCards } from "@/components/charts/SummaryCards";
import { CashflowChart, YearlyComparisonTable } from "@/components/charts/CashflowChart";
import { BucketsOverview } from "@/components/charts/BucketsOverview";
import { AccountsOverview } from "@/components/accounts/AccountsOverview";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DatabaseZap, FileSpreadsheet } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";

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
  const hasTransactions = importedTransactions.length > 0;
  const hasAccounts = accounts.some((account) => !account.isArchived);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
          แดชบอร์ด
        </h1>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          ภาพรวมการเงินทั้งหมดของคุณ
        </p>
      </div>

      {!hasTransactions ? (
        <>
          <Card>
            <EmptyState
              icon={<FileSpreadsheet size={20} />}
              title="ยังไม่มีข้อมูลธุรกรรมจริง"
              description="แดชบอร์ดฝั่ง cashflow จะเริ่มแสดงผลทันทีเมื่อมีการนำเข้าธุรกรรมจริง แต่ตอนนี้ข้อมูลบัญชี สินทรัพย์ หนี้สิน และพอร์ตลงทุนจาก account database พร้อมดูได้แล้ว"
              actionHref="/import"
              actionLabel="เริ่มนำเข้าไฟล์"
            />
          </Card>

          <AccountsOverview />

          {hasAccounts && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <AssetPieChart />

              <Card className="flex flex-col justify-between">
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-muted)]">
                    สถานะข้อมูล
                  </p>
                  <EmptyState
                    className="border-0 bg-transparent px-0 py-0"
                    icon={<DatabaseZap size={20} />}
                    title="บัญชีและพอร์ตลงทุนถูกเชื่อมแล้ว"
                    description="Net worth, asset allocation และ investment buckets กำลังอ่านจาก account database จริง ส่วน cashflow รายเดือนจะเริ่มทำงานเมื่อมีธุรกรรมจริง"
                    actionHref="/accounts"
                    actionLabel="เปิดหน้าบัญชี"
                  />
                </div>
              </Card>
            </div>
          )}

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
                  สถานะข้อมูล
                </p>
                <EmptyState
                  className="border-0 bg-transparent px-0 py-0"
                  icon={<DatabaseZap size={20} />}
                  title="ตอนนี้แอปใช้ข้อมูลธุรกรรมจริงแล้ว"
                  description={`มีข้อมูลที่นำเข้าแล้ว ${importedTransactions.length} รายการ และกำลังแสดงผลตามปี ${selectedYear} ขณะเดียวกันสินทรัพย์ หนี้สิน และการลงทุนอ่านจาก account database จริงแล้ว`}
                  actionHref="/accounts"
                  actionLabel="ดูฐานข้อมูลบัญชี"
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
