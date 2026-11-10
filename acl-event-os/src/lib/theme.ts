import type { PaymentMethod, TicketTypeId } from "./types";

/**
 * Categorical chart colours. Validated for the dark surface (#101114) with the
 * data-viz palette checker: lightness band, chroma, CVD separation and contrast all pass.
 * Colour follows the entity, never its rank. Status colours (green/amber/red) are not reused here.
 */
export const TYPE_COLOR: Record<TicketTypeId, string> = {
  GEN: "#3987e5",
  VIP: "#d55181",
  VVIP: "#c98500",
  RNG: "#199e70",
  EX: "#9085e9",
  RY: "#d95926",
};

export const METHOD_COLOR: Record<PaymentMethod, string> = {
  CARD: "#3987e5",
  BANK_TRANSFER: "#199e70",
  USSD: "#c98500",
  CASH_OUTLET: "#9085e9",
  POS_AGENT: "#d95926",
};

export const CHART = { grid: "#22252c", axis: "#6E7480", surface: "#101114", sold: "#E11D2E", remaining: "#6E7480", revenue: "#2EBD73" };
