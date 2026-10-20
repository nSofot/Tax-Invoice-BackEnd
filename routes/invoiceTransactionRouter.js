import express from "express";
import {
    createInvoiceTransaction,
    getInvoiceTransactionByNumber,
    getInvoiceTransactions,
} from "../controllers/invoiceTransactionController.js";

const invoiceTransactionRouter = express.Router();

invoiceTransactionRouter.post("/", createInvoiceTransaction);
invoiceTransactionRouter.get("/", getInvoiceTransactions);
invoiceTransactionRouter.get("/:invoiceNumber", getInvoiceTransactionByNumber);

export default invoiceTransactionRouter;
// module.exports = invoiceTransactionRouter
