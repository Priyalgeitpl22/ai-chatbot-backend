import { Router } from "express";
import { getAgents, createAgent, getAgent, updateAgent } from "../controllers/agent.controller";

const router = Router();

router.get("/org/:orgId", getAgents);
router.post("/", createAgent);
router.get("/:id", getAgent);
router.put("/", updateAgent);

export default router;
