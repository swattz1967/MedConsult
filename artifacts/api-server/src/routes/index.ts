import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agenciesRouter from "./agencies";
import usersRouter from "./users";
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

router.use(healthRouter);
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
router.use(storageRouter);
router.use(reminderSettingsRouter);
router.use(emailPreviewRouter);
router.use(emailLogsRouter);
router.use(publicCustomersRouter);

export default router;
