import type { Account, SavingsBucket, Transaction } from "@/lib/types";

export type ForecastHorizon = 30 | 60 | 90;

export interface ForecastPoint {
  date: string;
  day: number;
  balance: number;
  dangerFloor: number;
}

export interface CashflowForecast {
  horizonDays: ForecastHorizon;
  currentBalance: number;
  projectedBalance: number;
  lowestBalance: number;
  lowestDate: string;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  averageMonthlyNet: number;
  projectedDelta: number;
  dangerFloor: number;
  points: ForecastPoint[];
}

export interface SmartAlert {
  id: string;
  title: string;
  summary: string;
  kind: "action" | "warning" | "goal" | "insight" | "forecast" | "income";
  severity: "critical" | "warning" | "success" | "info";
  icon: string;
  href?: string;
  amount?: number;
}

interface AccountHealthLike {
  accountId: number;
  name: string;
  riskLevel: "info" | "green" | "watch" | "warning" | "critical";
  reconciliationStatus: string;
  storedBalance: number;
  balanceDifference: number;
  linkedTransactionCount: number;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTransactionYear(transaction: Transaction) {
  return Number.parseInt(transaction.date.slice(0, 4), 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getLatestTransactionDate(transactions: Transaction[], year: number) {
  const yearlyDates = transactions
    .filter((transaction) => getTransactionYear(transaction) === year)
    .map((transaction) => transaction.date)
    .sort();

  return yearlyDates.at(-1) ?? `${year}-12-31`;
}

function getActiveMonthCount(transactions: Transaction[], year: number) {
  const activeMonths = new Set(
    transactions
      .filter((transaction) => getTransactionYear(transaction) === year)
      .map((transaction) => transaction.date.slice(0, 7))
  );

  return Math.max(1, activeMonths.size);
}

function getYearlyCashflow(transactions: Transaction[], year: number) {
  return transactions
    .filter(
      (transaction) =>
        getTransactionYear(transaction) === year &&
        (transaction.type === "income" || transaction.type === "expense")
    )
    .reduce(
      (totals, transaction) => {
        if (transaction.type === "income") {
          totals.income += transaction.amount;
        } else {
          totals.expense += transaction.amount;
        }
        return totals;
      },
      { income: 0, expense: 0 }
    );
}

export function buildCashflowForecast(input: {
  transactions: Transaction[];
  accounts: Account[];
  year: number;
  horizonDays: ForecastHorizon;
  dangerFloor?: number;
}): CashflowForecast {
  const activeAccounts = input.accounts.filter((account) => !account.isArchived);
  const currentBalance = roundCurrency(
    activeAccounts.reduce((sum, account) => sum + account.currentBalance, 0)
  );
  const yearlyCashflow = getYearlyCashflow(input.transactions, input.year);
  const activeMonthCount = getActiveMonthCount(input.transactions, input.year);
  const averageMonthlyIncome = roundCurrency(yearlyCashflow.income / activeMonthCount);
  const averageMonthlyExpense = roundCurrency(yearlyCashflow.expense / activeMonthCount);
  const averageMonthlyNet = roundCurrency(averageMonthlyIncome - averageMonthlyExpense);
  const dailyNet = averageMonthlyNet / 30.4375;
  const dangerFloor = input.dangerFloor ?? 50_000;
  const latestDate = parseIsoDate(getLatestTransactionDate(input.transactions, input.year));
  const step = input.horizonDays <= 30 ? 2 : input.horizonDays <= 60 ? 4 : 6;
  const points: ForecastPoint[] = [];

  for (let day = 0; day <= input.horizonDays; day += step) {
    const date = addDays(latestDate, day);
    points.push({
      day,
      date: formatIsoDate(date),
      balance: roundCurrency(currentBalance + dailyNet * day),
      dangerFloor,
    });
  }

  if (points.at(-1)?.day !== input.horizonDays) {
    const date = addDays(latestDate, input.horizonDays);
    points.push({
      day: input.horizonDays,
      date: formatIsoDate(date),
      balance: roundCurrency(currentBalance + dailyNet * input.horizonDays),
      dangerFloor,
    });
  }

  const lowest = points.reduce((min, point) =>
    point.balance < min.balance ? point : min
  );
  const projectedBalance = points.at(-1)?.balance ?? currentBalance;

  return {
    horizonDays: input.horizonDays,
    currentBalance,
    projectedBalance,
    lowestBalance: lowest.balance,
    lowestDate: lowest.date,
    averageMonthlyIncome,
    averageMonthlyExpense,
    averageMonthlyNet,
    projectedDelta: roundCurrency(projectedBalance - currentBalance),
    dangerFloor,
    points,
  };
}

function getLatestMonth(transactions: Transaction[], year: number) {
  return transactions
    .filter((transaction) => getTransactionYear(transaction) === year)
    .map((transaction) => transaction.date.slice(0, 7))
    .sort()
    .at(-1);
}

function getCategoryMonthlyTotals(transactions: Transaction[], year: number) {
  const totals = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" || getTransactionYear(transaction) !== year) {
      continue;
    }

    const category = transaction.category?.trim() || "Uncategorized";
    const month = transaction.date.slice(0, 7);
    const bucket = totals.get(category) ?? new Map<string, number>();
    bucket.set(month, (bucket.get(month) ?? 0) + transaction.amount);
    totals.set(category, bucket);
  }

  return totals;
}

function riskWeight(risk: AccountHealthLike["riskLevel"]) {
  return { info: 0, green: 1, watch: 2, warning: 3, critical: 4 }[risk];
}

export function buildSmartAlerts(input: {
  transactions: Transaction[];
  accounts: Account[];
  year: number;
  forecast: CashflowForecast;
  accountHealth?: AccountHealthLike[];
  goals?: SavingsBucket[];
  language?: "th" | "en";
}): SmartAlert[] {
  const language = input.language ?? "th";
  const tr = (th: string, en: string) => (language === "en" ? en : th);
  const alerts: SmartAlert[] = [];
  const accountRisk = [...(input.accountHealth ?? [])]
    .filter((account) => riskWeight(account.riskLevel) >= riskWeight("watch"))
    .sort((left, right) => riskWeight(right.riskLevel) - riskWeight(left.riskLevel))[0];

  if (accountRisk) {
    alerts.push({
      id: `account-${accountRisk.accountId}`,
      title:
        accountRisk.reconciliationStatus === "no_linked_transactions"
          ? tr(
              `${accountRisk.name} ยังไม่มีรายการที่เชื่อมกับยอด`,
              `${accountRisk.name} has no ledger-linked rows`
            )
          : tr(
              `${accountRisk.name} ยอดต่างจาก ledger`,
              `${accountRisk.name} differs from the ledger`
            ),
      summary: tr(
        "เปิดบัญชีนี้เพื่อตรวจ alias, เพิ่มรายการตั้งต้น, หรือ reconcile ยอดให้ ledger อธิบายได้",
        "Open this account to review aliases, add an opening adjustment, or reconcile the stored balance."
      ),
      kind: "action",
      severity: accountRisk.riskLevel === "critical" ? "critical" : "warning",
      icon: "💳",
      href: `/accounts/${accountRisk.accountId}`,
      amount: Math.abs(accountRisk.balanceDifference || accountRisk.storedBalance),
    });
  }

  const latestMonth = getLatestMonth(input.transactions, input.year);
  const categoryTotals = getCategoryMonthlyTotals(input.transactions, input.year);
  const categorySpike = latestMonth
    ? [...categoryTotals.entries()]
        .map(([category, monthMap]) => {
          const current = monthMap.get(latestMonth) ?? 0;
          const otherMonths = [...monthMap.entries()].filter(([month]) => month !== latestMonth);
          const baseline =
            otherMonths.length > 0
              ? otherMonths.reduce((sum, [, amount]) => sum + amount, 0) / otherMonths.length
              : 0;
          return { category, current, baseline };
        })
        .filter((item) => item.current > 0 && item.current > Math.max(item.baseline * 1.25, 5_000))
        .sort((left, right) => right.current - left.current)[0]
    : null;

  if (categorySpike) {
    alerts.push({
      id: `spend-${categorySpike.category}`,
      title: tr(
        `${categorySpike.category} เดือนล่าสุดสูงกว่าปกติ`,
        `${categorySpike.category} is running above normal`
      ),
      summary: tr(
        "เปิดรายการที่กรองแล้วเพื่อดูร้าน/แท็กที่เป็น driver และเลือกจุดที่ลดได้จริง",
        "Open the filtered ledger to inspect merchants/tags driving the spike."
      ),
      kind: "warning",
      severity: "warning",
      icon: "🧾",
      href: `/transactions?year=${input.year}&type=expense&category=${encodeURIComponent(categorySpike.category)}`,
      amount: categorySpike.current,
    });
  }

  const nearGoal = [...(input.goals ?? [])]
    .filter((goal) => !goal.isArchived && goal.progressPercent >= 70 && goal.progressPercent < 100)
    .sort((left, right) => right.progressPercent - left.progressPercent)[0];

  if (nearGoal) {
    alerts.push({
      id: `goal-${nearGoal.id}`,
      title: tr(`${nearGoal.name} ใกล้ถึงเป้าแล้ว`, `${nearGoal.name} is close to target`),
      summary: tr(
        `เหลืออีก ${Math.max(0, Math.round(nearGoal.remainingAmount)).toLocaleString("th-TH")} บาท ตรวจ pace แล้วเติมครั้งถัดไปได้เลย`,
        `${Math.max(0, Math.round(nearGoal.remainingAmount)).toLocaleString("en-US")} THB remaining. Review the pace and plan the next contribution.`
      ),
      kind: "goal",
      severity: "success",
      icon: nearGoal.icon,
      href: `/buckets/${nearGoal.id}`,
      amount: nearGoal.remainingAmount,
    });
  }

  alerts.push({
    id: "forecast",
    title:
      input.forecast.projectedDelta >= 0
        ? tr("Forecast: ยอดเงินมีแนวโน้มเพิ่มขึ้น", "Forecast: balance is trending up")
        : tr("Forecast: ยอดเงินมีแนวโน้มลดลง", "Forecast: balance is trending down"),
    summary: tr(
      `อีก ${input.forecast.horizonDays} วัน คาดว่าจะอยู่ที่ ${Math.round(
        input.forecast.projectedBalance
      ).toLocaleString("th-TH")} บาท`,
      `In ${input.forecast.horizonDays} days, projected balance is ${Math.round(
        input.forecast.projectedBalance
      ).toLocaleString("en-US")} THB.`
    ),
    kind: "forecast",
    severity: input.forecast.lowestBalance < input.forecast.dangerFloor ? "critical" : "info",
    icon: "🔮",
    href: "/forecast",
    amount: input.forecast.projectedBalance,
  });

  const yearlyCashflow = getYearlyCashflow(input.transactions, input.year);
  const savingsRate =
    yearlyCashflow.income > 0
      ? ((yearlyCashflow.income - yearlyCashflow.expense) / yearlyCashflow.income) * 100
      : 0;

  alerts.push({
    id: "savings-rate",
    title:
      savingsRate >= 20
        ? tr("Savings Rate อยู่ในโซนดี", "Savings rate is in a healthy zone")
        : tr("Savings Rate ยังต่ำกว่าเป้า 20%", "Savings rate is below the 20% target"),
    summary: tr(
      `อัตราปัจจุบัน ${savingsRate.toFixed(1)}% จากรายการในปี ${input.year}`,
      `Current rate is ${savingsRate.toFixed(1)}% from ${input.year} transactions.`
    ),
    kind: "insight",
    severity: savingsRate >= 20 ? "success" : "warning",
    icon: "📈",
    href: "/reports",
  });

  return alerts;
}
