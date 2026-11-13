/**
 * Payment gateway boundary.
 *
 * Checkout code only talks to `PaymentProvider`. To go live, implement this
 * interface for a real gateway (e.g. Paystack, Flutterwave, M-Pesa, Stripe),
 * read its keys from environment variables, and register it in `getPaymentProvider`.
 * No credentials live in this repository.
 */
export type ChargeRequest = { orderNumber: string; amountMinor: number; currency: string; email: string; description: string };
export type ChargeResult = { status: "succeeded" | "failed"; reference: string; message?: string };

export interface PaymentProvider {
  readonly name: string;
  /** True when no real money moves. Surfaced in the checkout UI. */
  readonly isMock: boolean;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/** MOCK SERVICE — approves every charge instantly and moves no money. */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isMock = true;
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    return { status: "succeeded", reference: `MOCK-${req.orderNumber}` };
  }
}

export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER ?? "mock") {
    case "mock":
      return new MockPaymentProvider();
    default:
      throw new Error(`Payment provider "${process.env.PAYMENT_PROVIDER}" is not implemented. See src/server/integrations/payments.ts.`);
  }
}
