"use client";

import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function BucketsPage() {
  const { getBuckets } = useFinanceStore();
  const buckets = getBuckets();

  const totalSaved = buckets.reduce((s, b) => s + b.currentAmount, 0);
  const totalTarget = buckets.reduce((s, b) => s + b.targetAmount, 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Savings Buckets
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            กระปุกเป้าหมายการออม — จัดสรรเงินตามเป้าหมาย
          </p>
        </div>
        <Button size="sm">
          <Plus size={16} />
          เพิ่ม Bucket
        </Button>
      </div>

      {buckets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GripVertical size={20} />}
            title="ยังไม่มี Savings Buckets"
            description="ตอนนี้ยังไม่มีข้อมูลเป้าหมายการออม คุณสามารถเริ่มจากการนำเข้าธุรกรรมจริงก่อน แล้วค่อยเพิ่ม bucket ภายหลังได้"
            actionHref="/import"
            actionLabel="นำเข้าข้อมูล"
          />
        </Card>
      ) : (
        <>
          {/* Overall Progress */}
          <Card>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  ความคืบหน้ารวม
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                  {formatBaht(totalSaved)}{" "}
                  <span className="text-sm font-normal text-zinc-400">
                    / {formatBaht(totalTarget)}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {overallPercent}%
                </p>
              </div>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </Card>

          {/* Bucket Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {buckets.map((bucket) => {
              const percent = Math.min(
                100,
                Math.round((bucket.currentAmount / bucket.targetAmount) * 100)
              );
              const remaining = bucket.targetAmount - bucket.currentAmount;

              return (
                <Card key={bucket.id} className="group cursor-move">
                  <div className="flex items-start gap-3">
                    <GripVertical
                      size={16}
                      className="mt-1 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{bucket.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-zinc-800 dark:text-zinc-100">
                            {bucket.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            ลงทุนผ่าน: {bucket.investmentType}
                          </p>
                        </div>
                        <span
                          className="rounded-xl px-3 py-1.5 text-sm font-bold"
                          style={{
                            backgroundColor: `${bucket.color}15`,
                            color: bucket.color,
                          }}
                        >
                          {percent}%
                        </span>
                      </div>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: bucket.color,
                          }}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-zinc-400 dark:text-zinc-500">สะสม</p>
                          <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                            {formatBaht(bucket.currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400 dark:text-zinc-500">เป้าหมาย</p>
                          <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                            {formatBaht(bucket.targetAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400 dark:text-zinc-500">
                            ต้องเก็บอีก
                          </p>
                          <p className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatBaht(remaining > 0 ? remaining : 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
