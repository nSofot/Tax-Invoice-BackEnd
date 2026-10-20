import express from "express";

import { getCompanyData,
    createCompanyData,
    updateCompanyData
 } from "../controllers/companyDataController.js";

const companyDataRoutes = express.Router();

companyDataRoutes.get("/", getCompanyData);
companyDataRoutes.post("/", createCompanyData);
companyDataRoutes.put("/:companyId", updateCompanyData);

export default companyDataRoutes;