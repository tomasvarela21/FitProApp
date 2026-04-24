import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { StudentPortalController } from "./student-portal.controller";

export const studentPortalRouter = Router();

studentPortalRouter.use(requireAuth, requireRole("STUDENT"));

studentPortalRouter.get("/profile", StudentPortalController.getMyProfile);
studentPortalRouter.patch("/profile", StudentPortalController.updateMyProfile);
studentPortalRouter.get("/subscription", StudentPortalController.getMySubscription);
