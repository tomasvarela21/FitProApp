export type SubscriptionDto = {
  id: string;
  studentId: string;
  studentName: string;
  planId: string;
  planName: string;
  planDuration: string;
  price: number;
  status: string;
  startDate: Date;
  endDate: Date;
  daysUntilExpiry: number;
  createdAt: Date;
};
