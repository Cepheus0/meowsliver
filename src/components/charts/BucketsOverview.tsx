"use client";

import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PiggyBank } from "lucide-react";

export function BucketsOverview() {
  const { getBuckets } = useFinanceStore();
  const buckets = getBuckets();

  if (buckets.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Savings Buckets - กระปุกเป้าหมาย</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<PiggyBank size={20} />}
          title="ยังไม่มี Savings Buckets"
          description="ข้อมูลกระปุกเป้าหมายถูกล้างออกแล้ว ตอนนี้สามารถเริ่มต้นจากการนำเข้าธุรกรรมจริงก่อน"
          actionHref="/import"
          actionLabel="นำเข้าข้อมูล"
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Savings Buckets - กระปุกเป้าหมาย</CardTitle>
      </CardHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {buckets.map((bucket) => {
          const percent = Math.min(
            100,
            Math.round((bucket.currentAmount / bucket.targetAmount) * 100)
          );

          return (
            <div
              key={bucket.id}
              className="group rounded-xl border border-zinc-100 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-2xl">{bucket.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {bucket.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {bucket.investmentType}
                  </p>
                </div>
                <span
                  className="rounded-lg px-2.5 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: `${bucket.color}15`,
                    color: bucket.color,
                  }}
                >
                  {percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: bucket.color,
                  }}
                />
              </div>

              {/* Amounts */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {formatBaht(bucket.currentAmount)}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">
                  / {formatBaht(bucket.targetAmount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
