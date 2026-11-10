/**
 * Payment provider boundary.
 *
 * ACL EVENT OS never talks to a gateway directly: services call a
 * PaymentProvider. Demo mode ships DemoPaymentProvider, which moves no money
 * and says so. To go live, implement this interface for Paystack / Flutterwave
 * / Monnify etc. and return it from getPaymentProvider().
 */
import type { PaymentMethod, PaymentStatus } from "@/lib/types";

export interface ChargeRequest {
  amount: number;
  currency: "NGN";
  method: PaymentMethod;
  reference: string;
  customer: { name: string; email: string; phone: string };
  /** Demo only: lets an operator rehearse a declined card. */
  simulateDecline?: boolean;
}

export interface ChargeResult {
  status: Extract<PaymentStatus, "PAID" | "PENDING" | "FAILED">;
  provider: string;
  failureReason?: string;
  /** Shown to the customer / cashier, e.g. transfer account or USSD string. */
  instructions?: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(req: ChargeRequest): ChargeResult;
  /** Production: verify a webhook / poll the gateway. Demo: staff confirm manually. */
  refund(reference: string, amount: number): { ok: boolean; failureReason?: string };
}

class DemoPaymentProvider implements PaymentProvider {
  readonly name = "demo-gateway";
  charge(req: ChargeRequest): ChargeResult {
    if (req.simulateDecline) return { status: "FAILED", provider: this.name, failureReason: "Card declined by issuer (simulated)" };
    switch (req.method) {
      case "BANK_TRANSFER":
        return { status: "PENDING", provider: this.name, instructions: `Awaiting transfer. Quote reference ${req.reference}. Finance confirms on receipt.` };
      case "USSD":
        return { status: "PENDING", provider: this.name, instructions: `Awaiting USSD confirmation for ${req.reference}.` };
      case "CARD":
        return { status: "PAID", provider: this.name };
      case "POS_AGENT":
      case "CASH_OUTLET":
        // Money is collected in person; the sale is recorded as paid by the seller.
        return { status: "PAID", provider: "in-person" };
    }
  }
  refund() {
    return { ok: true };
  }
}

const provider = new DemoPaymentProvider();
export const getPaymentProvider = (): PaymentProvider => provider;
