import express from "express";
import {
    CreateCustomer,
    deleteCustomer,
    getCustomer,
    getCustomerById,
    searchCustomers,
    updateCustomer,
} from "../controllers/customerController.js";

const customerRouter = express.Router();

// Keep the named search route before /:customerId so "search" is not treated as an ID.
customerRouter.get("/search", searchCustomers);
customerRouter.post("/", CreateCustomer);
customerRouter.get("/", getCustomer);
customerRouter.get("/:customerId", getCustomerById);
customerRouter.put("/:customerId", updateCustomer);
customerRouter.delete("/:customerId", deleteCustomer);

export default customerRouter;
