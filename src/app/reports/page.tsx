"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ClientOnlyChart } from "@/components/charts/ClientOnlyChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { getExpenseBreakdownFromTransactions } from "@/lib/finance-analytics";
import { FileSpreadsheet } from "lucide-react";

export default function ReportsPage() {
  const { getYearlySummaries, getMonthlyCashflow, getTransactions, selectedYear, importedTransactions } =
    useFinanceStore();
  const summaries = getYearlySummaries();
  const monthly = getMonthlyCashflow();
  const selectedYearTransactions = getTransactions();

  // Net Worth over years
  const netWorthData = summaries.map((s) => ({
    year: String(s.year),
    netWorth: s.netWorth,
  }));

  const expenseBreakdown = getExpenseBreakdownFromTransactions(
    importedTransactions,
    selectedYear
  );

  const savingsData = summaries.map((s) => ({
    year: String(s.year),
    rate: s.savingsRate,
  }));

  const hasAnyTransactions = importedTransactions.length > 0;
  const hasSelectedYearData = selectedYearTransactions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          รายงาน
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          วิเคราะห์ภาพรวมการเงินย้อนหลัง
        </p>
      </div>

      {!hasAnyTransactions ? (
        <Card>
          <EmptyState
            icon={<FileSpreadsheet size={20} />}
            title="ยังไม่มีข้อมูลสำหรับสร้างรายงาน"
            description="เมื่อคุณนำเข้าธุรกรรมจริง ระบบจะสร้างรายงานย้อนหลังให้อัตโนมัติ"
            actionHref="/import"
            actionLabel="เริ่มนำเข้าข้อมูล"
          />
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Net Worth Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>ยอดสุทธิสะสมย้อนหลัง</CardTitle>
          </CardHeader>
          <ClientOnlyChart className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value) => formatBaht(Number(value))}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #27272a",
                    backgroundColor: "#18181b",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="ยอดสุทธิสะสม"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนรายจ่าย ปี {selectedYear}</CardTitle>
          </CardHeader>
          {expenseBreakdown.length === 0 ? (
            <EmptyState
              title={`ยังไม่มีรายจ่ายในปี ${selectedYear}`}
              description="ลองเปลี่ยนปีที่ด้านบน หรือเริ่มจากการนำเข้ารายการธุรกรรมจริงในปีที่ต้องการ"
              actionHref="/import"
              actionLabel="นำเข้าธุรกรรม"
            />
          ) : (
            <>
              <ClientOnlyChart className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatBaht(Number(value))}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #27272a",
                        backgroundColor: "#18181b",
                        color: "#f4f4f5",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ClientOnlyChart>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {expenseBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {item.name}
                    </span>
                    <span className="ml-auto font-medium text-zinc-700 dark:text-zinc-200">
                      {formatBaht(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Monthly Expense vs Income */}
        <Card>
          <CardHeader>
            <CardTitle>รายรับ vs รายจ่าย รายเดือน ปี {selectedYear}</CardTitle>
          </CardHeader>
          {hasSelectedYearData ? (
            <ClientOnlyChart className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatBaht(Number(value))}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #27272a",
                      backgroundColor: "#18181b",
                      color: "#f4f4f5",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="income" name="รายรับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          ) : (
            <EmptyState
              title={`ยังไม่มีข้อมูลปี ${selectedYear}`}
              description="กราฟรายเดือนจะแสดงเมื่อมีรายการรายรับหรือรายจ่ายในปีที่เลือก"
            />
          )}
        </Card>

        {/* Savings Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>อัตราการออม % ย้อนหลัง</CardTitle>
          </CardHeader>
          <ClientOnlyChart className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} unit="%" />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #27272a",
                    backgroundColor: "#18181b",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="rate" name="Savings Rate" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ClientOnlyChart>
        </Card>
      </div>
      )}
    </div>
  );
}
