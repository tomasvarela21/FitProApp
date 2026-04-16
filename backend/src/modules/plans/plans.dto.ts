export type PlanDto = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
