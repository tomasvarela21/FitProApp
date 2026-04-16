import type { Plan } from "@prisma/client";
import type { PlanDto } from "./plans.dto";

export class PlansMapper {
  static toDto(plan: Plan): PlanDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      duration: plan.duration,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
