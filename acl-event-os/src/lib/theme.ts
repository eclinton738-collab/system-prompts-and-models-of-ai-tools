import type { PaymentMethod, TicketTypeId } from "./types";

/**
 * Categorical chart colours, resolved per theme from CSS variables (globals.css).
 * Both the dark and light sets were run through the data-viz palette checker
 * (lightness band, chroma, CVD separation). Every chart keeps a labelled legend,
 * so the lighter hues on white never carry identity by colour alone.
 * Colour follows the entity, never its rank. Status colours (green/amber/red) are not reused here.
 */
export const TYPE_COLOR: Record<TicketTypeId, string> = {
  GEN: "var(--series-blue)",
  VIP: "var(--series-magenta)",
  VVIP: "var(--series-yellow)",
  RNG: "var(--series-aqua)",
  EX: "var(--series-violet)",
  RY: "var(--series-orange)",
};

export const METHOD_COLOR: Record<PaymentMethod, string> = {
  CARD: "var(--series-blue)",
  BANK_TRANSFER: "var(--series-aqua)",
  USSD: "var(--series-yellow)",
  CASH_OUTLET: "var(--series-violet)",
  POS_AGENT: "var(--series-orange)",
};

export const CHART = { grid: "var(--chart-grid)", axis: "var(--chart-axis)", surface: "var(--chart-surface)", sold: "#E11D2E", remaining: "var(--chart-axis)", revenue: "rgb(var(--ok))" };
