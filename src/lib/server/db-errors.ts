export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isDatabaseUnavailableError(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("Connection terminated") ||
    message.includes("Failed query:")
  );
}

export function databaseUnavailableResponseBody() {
  return {
    error: "ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาเปิด PostgreSQL แล้วลองใหม่",
    detail: "database_unavailable",
  };
}
