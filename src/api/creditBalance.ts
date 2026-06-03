import type { UsageClient, GetCreditBalanceOptions } from "./client";
import type { CreditBalanceResponse } from "../types/contract";

export async function getCreditBalance(
  client: UsageClient,
  opts: GetCreditBalanceOptions
): Promise<CreditBalanceResponse> {
  return client.getCreditBalance(opts);
}
