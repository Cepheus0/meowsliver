import { describe, expect, it } from "vitest";
import {
  buildDashboardAiContext,
  buildDashboardChatMessages,
  buildDashboardInsightUserPrompt,
  serializeDashboardAiContext,
} from "@/lib/ai/dashboard-context";
import type { MetricPacket } from "@/lib/metrics/types";

function packet(scope: string, caveats: string[] = []): MetricPacket<unknown, unknown> {
  return {
    scope,
    metrics: { value: 1 },
    evidence: { rows: [{ label: scope, amount: 1 }] },
    generatedAt: "2026-04-23T00:00:00.000Z",
    coverage: {
      generatedFrom: [scope],
      caveats,
    },
  };
}

describe("dashboard AI context", () => {
  it("builds a compact evidence context from metric packets", () => {
    const context = buildDashboardAiContext({
      dashboardPacket: packet("dashboard", ["account_balances_are_stored_values"]),
      deterministicInsightPacket: packet("dashboard.insights"),
      anomalyPacket: packet("transactions.anomalies.today"),
      accountHealthPacket: packet("accounts.health", ["account_balances_are_stored_values"]),
      goalHealthPacket: packet("goals.health"),
      importQualityPacket: packet("imports.recent"),
      generatedAt: "2026-04-23T00:00:00.000Z",
    });

    expect(context.scope).toBe("dashboard");
    expect(context.caveats).toEqual(["account_balances_are_stored_values"]);
    expect(context.packets.dashboard.metrics).toEqual({ value: 1 });
  });

  it("injects metric context before recent chat messages", () => {
    const context = buildDashboardAiContext({
      dashboardPacket: packet("dashboard"),
      deterministicInsightPacket: packet("dashboard.insights"),
      anomalyPacket: packet("transactions.anomalies.today"),
      accountHealthPacket: packet("accounts.health"),
      goalHealthPacket: packet("goals.health"),
      importQualityPacket: packet("imports.recent"),
    });
    const messages = buildDashboardChatMessages(context, [
      { role: "user", content: "เดือนนี้ควรดูอะไร" },
    ]);

    expect(messages[0].role).toBe("system");
    expect(messages[1].content).toContain("METRIC_CONTEXT");
    expect(messages.at(-1)?.content).toBe("เดือนนี้ควรดูอะไร");
  });

  it("builds an insight prompt with executive sections", () => {
    const context = buildDashboardAiContext({
      dashboardPacket: packet("dashboard"),
      deterministicInsightPacket: packet("dashboard.insights"),
      anomalyPacket: packet("transactions.anomalies.today"),
      accountHealthPacket: packet("accounts.health"),
      goalHealthPacket: packet("goals.health"),
      importQualityPacket: packet("imports.recent"),
    });

    expect(buildDashboardInsightUserPrompt(context)).toContain("Next Actions");
  });

  it("keeps large evidence arrays inside a local model prompt budget", () => {
    const largeEvidencePacket = packet("accounts.health");
    largeEvidencePacket.evidence = {
      accounts: Array.from({ length: 30 }, (_, index) => ({
        accountId: index + 1,
        name: `Account ${index + 1}`,
        riskLevel: index === 20 ? "watch" : "green",
        balanceDifference: index * 1000,
      })),
    };

    const context = buildDashboardAiContext({
      dashboardPacket: largeEvidencePacket,
      deterministicInsightPacket: packet("dashboard.insights"),
      anomalyPacket: packet("transactions.anomalies.today"),
      accountHealthPacket: largeEvidencePacket,
      goalHealthPacket: packet("goals.health"),
      importQualityPacket: packet("imports.recent"),
    });
    const serialized = serializeDashboardAiContext(context);

    expect(serialized.length).toBeLessThan(9000);
    expect(serialized).toContain("omittedCount");
    expect(serialized).toContain("Account 21");
  });
});
