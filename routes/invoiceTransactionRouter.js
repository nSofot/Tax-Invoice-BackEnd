import express from "express";
import {
    createInvoiceTransaction,
    getInvoiceTransactionByNumber,
    getInvoiceTransactions,
    previewNextInvoiceNumber,
} from "../controllers/invoiceTransactionController.js";

const invoiceTransactionRouter = express.Router();

invoiceTransactionRouter.post("/", createInvoiceTransaction);
invoiceTransactionRouter.get("/next-number", previewNextInvoiceNumber);
invoiceTransactionRouter.get("/", getInvoiceTransactions);
invoiceTransactionRouter.get("/:invoiceNumber", getInvoiceTransactionByNumber);

export default invoiceTransactionRouter;
// module.exports = invoiceTransactionRouter
