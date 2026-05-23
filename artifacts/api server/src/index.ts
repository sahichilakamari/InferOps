import { Router, type IRouter } from "express";
import healthRouters from "./health";
import incidentsRouter from "./incidents";
import servicesRouter from "./services";
import metricsRouter from "./metrics";
import logsRouter from "./logs";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/incidents", incidentsRouter);
router.use("/services", servicesRouter);
router.use("/metrics", metricsRouter);
router.use("/logs", logsRouter);
router.use("/ai", aiRouter);
router.use("/dashboard", dashboardRouter);

export default router;
