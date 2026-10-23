import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import waitlistRouter from "./waitlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(waitlistRouter);

export default router;
