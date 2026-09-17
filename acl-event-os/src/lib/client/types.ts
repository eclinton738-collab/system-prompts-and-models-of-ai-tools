import type {
  HeadlineStats, TypeBreakdown, TrendPoint, WeeklyPoint, Delta, Slice,
  CheckInStats, AgentPerformance,
} from "@/lib/domain/stats";
import type {
  AclEvent, AclNotification, CheckIn, EventTable, Gate, PaymentMethod,
  PaymentStatus, SalesChannel, SecurityEvent, TicketTypeCode, User,
} from "@/lib/domain/types";

export interface RecentSale {
  id: string;
  name: string;
  type: TicketTypeCode;
  amount: number;
  method: PaymentMethod;
  channel: SalesChannel;
  status: PaymentStatus;
  at: string;
}

export interface DashboardState {
  event: AclEvent;
  gates: Gate[];
  users: User[];
  stats: HeadlineStats;
  breakdown: TypeBreakdown[];
  trend: { daily: TrendPoint[]; weekly: WeeklyPoint[] };
  wow: { tickets: Delta; revenue: Delta };
  methods: Slice[];
  channels: Slice[];
  paymentStatus: Slice[];
  checkIn: CheckInStats;
  agents: AgentPerformance[];
  recentSales: RecentSale[];
  recentScans: CheckIn[];
  lastScan: CheckIn | null;
  securityEvents: SecurityEvent[];
  notifications: AclNotification[];
  tables: EventTable[];
  gatesOpen: { open: boolean; detail: string };
  serverTime: string;
}

export interface Paged<T> {
  rows: T[];
  page: number;
  size: number;
  total: number;
  pages: number;
}
