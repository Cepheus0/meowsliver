"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Target, Plus, Trash2, Check } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  completed: boolean;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);

  const handleAdd = () => {
    if (!newTitle || !newTarget) return;
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newTitle,
      targetAmount: Number(newTarget),
      currentAmount: 0,
      deadline: newDeadline || "2027-12-31",
      category: "อื่นๆ",
      completed: false,
    };
    setGoals((prev) => [...prev, newGoal]);
    setNewTitle("");
    setNewTarget("");
    setNewDeadline("");
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleToggle = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            เป้าหมาย
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ตั้งเป้า ติดตาม ทำได้จริง
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} />
          เพิ่มเป้าหมาย
        </Button>
      </div>

      {/* Add Goal Form */}
      {showAdd && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            เป้าหมายใหม่
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="ชื่อเป้าหมาย"
              className="rounded-xl border border-zinc-200 bg-transparent px-4 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
            />
            <input
              type="number"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="จำนวนเงิน (บาท)"
              className="rounded-xl border border-zinc-200 bg-transparent px-4 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
            />
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-transparent px-4 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleAdd} size="sm">
              บันทึก
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              ยกเลิก
            </Button>
          </div>
        </Card>
      )}

      {/* Active Goals */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          กำลังดำเนินการ ({activeGoals.length})
        </h2>
        {activeGoals.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Target size={20} />}
              title="ยังไม่มีเป้าหมาย"
              description="คุณสามารถกด “เพิ่มเป้าหมาย” เพื่อเริ่มต้นวางแผนการออมได้ทันที"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeGoals.map((goal) => {
              const percent = Math.min(
                100,
                Math.round((goal.currentAmount / goal.targetAmount) * 100)
              );
              return (
                <Card key={goal.id} className="group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Target size={20} className="shrink-0 text-emerald-500" />
                      <div>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-100">
                          {goal.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {goal.category} • ครบกำหนด {goal.deadline}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleToggle(goal.id)}
                        className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {formatBaht(goal.currentAmount)} / {formatBaht(goal.targetAmount)}
                    </span>
                    <span className="font-bold text-emerald-500">{percent}%</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            สำเร็จแล้ว ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="opacity-60">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                    <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-800 line-through dark:text-zinc-200">
                      {goal.title}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatBaht(goal.targetAmount)} — {goal.category}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
