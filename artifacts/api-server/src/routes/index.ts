import { Router, type IRouter } from "express";
import { requireAuth, requireUser } from "../middlewares/auth";
import healthRouter from "./health";
import agenciesRouter from "./agencies";
import usersRouter from "./users";
import userSyncRouter from "./user-sync";
import surgeonsRouter from "./surgeons";
import eventsRouter from "./events";
import customersRouter from "./customers";
import appointmentsRouter from "./appointments";
import questionnairesRouter from "./questionnaires";
import consultationsRouter from "./consultations";
import configRouter from "./config";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import reminderSettingsRouter from "./reminder-settings";
import emailPreviewRouter from "./email-preview";
import emailLogsRouter from "./email-logs";
import publicCustomersRouter from "./public-customers";

const router: IRouter = Router();

// Publicly accessible routes — no authentication required
router.use(healthRouter);
router.use(publicCustomersRouter);
router.use(storageRouter); // storage router handles its own auth per path

// All routes below require a valid Clerk session
router.use(requireAuth);

// Sync endpoint: needs Clerk auth but user may not exist in DB yet
router.use(userSyncRouter);

// All routes below also require a local DB user record
router.use(requireUser);

router.use(agenciesRouter);
router.use(usersRouter);
router.use(surgeonsRouter);
router.use(eventsRouter);
router.use(customersRouter);
router.use(appointmentsRouter);
router.use(questionnairesRouter);
router.use(consultationsRouter);
router.use(configRouter);
router.use(dashboardRouter);
router.use(reminderSettingsRouter);
router.use(emailPreviewRouter);
router.use(emailLogsRouter);

export default router;
