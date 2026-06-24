import { NextResponse } from "next/server";
import { clearCustomerSessionToken } from "@/lib/eshop-customer-session";

export async function GET(request: Request) {
  await clearCustomerSessionToken();
  const next = new URL(request.url).searchParams.get("next")?.trim() || "/cuenta/login";
  return NextResponse.redirect(new URL(next, request.url));
}
