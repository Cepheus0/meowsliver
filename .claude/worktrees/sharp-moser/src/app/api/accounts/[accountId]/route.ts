import { NextResponse } from "next/server";
import {
  archiveAccount,
  getAccountDetail,
  updateAccount,
} from "@/lib/server/accounts";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && value in ACCOUNT_TYPE_LABELS;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const id = parseId(accountId);
    if (!id) {
      return NextResponse.json({ error: "invalid account id" }, { status: 400 });
    }

    const detail = await getAccountDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Failed to load account", error);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดบัญชีได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const id = parseId(accountId);
    if (!id) {
      return NextResponse.json({ error: "invalid account id" }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const updated = await updateAccount(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      type: isAccountType(body.type) ? body.type : undefined,
      icon: typeof body.icon === "string" ? body.icon : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      currentBalance:
        body.currentBalance != null && body.currentBalance !== ""
          ? Number(body.currentBalance)
          : undefined,
      creditLimit:
        body.creditLimit === null
          ? null
          : body.creditLimit != null && body.creditLimit !== ""
            ? Number(body.creditLimit)
            : undefined,
      notes:
        body.notes === null
          ? null
          : typeof body.notes === "string"
            ? body.notes
            : undefined,
      aliases: Array.isArray(body.aliases)
        ? (body.aliases.filter((a) => typeof a === "string") as string[])
        : undefined,
      isArchived:
        typeof body.isArchived === "boolean" ? body.isArchived : undefined,
      isDefault:
        typeof body.isDefault === "boolean" ? body.isDefault : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    return NextResponse.json({ account: updated });
  } catch (error) {
    console.error("Failed to update account", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตบัญชีได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const id = parseId(accountId);
    if (!id) {
      return NextResponse.json({ error: "invalid account id" }, { status: 400 });
    }

    const archived = await archiveAccount(id);
    if (!archived) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    return NextResponse.json({ account: archived });
  } catch (error) {
    console.error("Failed to archive account", error);
    return NextResponse.json(
      { error: "ไม่สามารถเก็บบัญชีได้" },
      { status: 500 }
    );
  }
}
