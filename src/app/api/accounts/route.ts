import { NextResponse } from "next/server";
import { createAccount, listAccounts } from "@/lib/server/accounts";
import {
  databaseUnavailableResponseBody,
  isDatabaseUnavailableError,
} from "@/lib/server/db-errors";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/types";

export const dynamic = "force-dynamic";

function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && value in ACCOUNT_TYPE_LABELS;
}

export async function GET() {
  try {
    const accounts = await listAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn("Accounts are unavailable because the database is not ready.");
      return NextResponse.json(databaseUnavailableResponseBody(), { status: 503 });
    }

    console.warn("Failed to load accounts.");
    return NextResponse.json(
      { error: "ไม่สามารถโหลดบัญชีได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = isAccountType(body.type) ? body.type : null;

    if (!name) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อบัญชี" },
        { status: 400 }
      );
    }
    if (!type) {
      return NextResponse.json(
        { error: "กรุณาเลือกประเภทบัญชี" },
        { status: 400 }
      );
    }

    const initialBalance = Number(body.initialBalance ?? 0);
    const creditLimit =
      body.creditLimit != null && body.creditLimit !== ""
        ? Number(body.creditLimit)
        : undefined;

    if (!Number.isFinite(initialBalance)) {
      return NextResponse.json(
        { error: "ยอดตั้งต้นต้องเป็นตัวเลข" },
        { status: 400 }
      );
    }

    const account = await createAccount({
      name,
      type,
      icon: typeof body.icon === "string" ? body.icon : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      aliases: Array.isArray(body.aliases)
        ? (body.aliases.filter((a) => typeof a === "string") as string[])
        : undefined,
      isDefault: Boolean(body.isDefault),
      initialBalance,
      creditLimit:
        creditLimit != null && Number.isFinite(creditLimit) ? creditLimit : undefined,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Failed to create account", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างบัญชีได้" },
      { status: 500 }
    );
  }
}
