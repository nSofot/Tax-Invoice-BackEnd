import InvoiceTransaction from "../models/invoiceTransaction.js";

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
const regexEscape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function createInvoiceTransaction(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Please login to create an invoice" });
    }

    const body = req.body || {};
    const date = new Date(body.date);
    if (!body.number || !String(body.number).trim()) {
        return res.status(400).json({ message: "Tax invoice number is required" });
    }
    if (!body.supplierName || !String(body.supplierName).trim()) {
        return res.status(400).json({ message: "Supplier name is required" });
    }
    if (!body.buyerName || !String(body.buyerName).trim()) {
        return res.status(400).json({ message: "Purchaser name is required" });
    }
    if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ message: "A valid invoice date is required" });
    }
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
        return res.status(400).json({ message: "At least one invoice item is required" });
    }

    const lines = [];
    for (const [index, item] of body.lines.entries()) {
        const description = String(item?.description || "").trim();
        const quantity = Number(item?.quantity);
        const unitPrice = Number(item?.unitPrice);
        if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
            return res.status(400).json({ message: `Invoice item ${index + 1} has invalid description, quantity, or unit price` });
        }
        lines.push({ description, quantity, unitPrice, amount: roundMoney(quantity * unitPrice) });
    }

    const subTotal = roundMoney(lines.reduce((sum, item) => sum + item.amount, 0));
    const sscl = roundMoney(subTotal * 0.025);
    const vat = roundMoney((subTotal + sscl) * 0.18);
    const total = roundMoney(subTotal + sscl + vat);

    try {
        const invoice = await InvoiceTransaction.create({
            number: String(body.number).trim(),
            date,
            supplierTin: body.supplierTin || "",
            supplierName: String(body.supplierName).trim(),
            supplierAddress: body.supplierAddress || "",
            supplierPhone: body.supplierPhone || "",
            buyerTin: body.buyerTin || "",
            buyerName: String(body.buyerName).trim(),
            buyerAddress: body.buyerAddress || "",
            buyerPhone: body.buyerPhone || "",
            vehicle: body.vehicle || "",
            reference: body.reference || "",
            payment: body.payment || "Cash",
            lines,
            subTotal,
            sscl,
            vat,
            total,
            words: body.words || "",
        });
        return res.status(201).json({ message: "Invoice saved successfully", invoice });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An invoice with this number already exists" });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({ message: "Invoice data is invalid", error: error.message });
        }
        console.error("Error saving invoice transaction:", error);
        return res.status(500).json({ message: "Failed to save invoice", error: error.message });
    }
}

export async function getInvoiceTransactions(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Please login to view invoices" });
    }

    const query = String(req.query.query || "").trim();
    const filter = {
        number: { $exists: true },
        ...(query
            ? {
                $or: ["number", "buyerName", "vehicle", "reference"].map((field) => ({
                [field]: { $regex: regexEscape(query), $options: "i" },
                })),
            }
            : {}),
    };

    try {
        const invoices = await InvoiceTransaction.find(filter).sort({ date: -1, createdAt: -1 });
        return res.json(invoices);
    } catch (error) {
        console.error("Error getting invoice transactions:", error);
        return res.status(500).json({ message: "Failed to load invoices", error: error.message });
    }
}

export async function getInvoiceTransactionByNumber(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Please login to view invoices" });
    }

    try {
        const invoice = await InvoiceTransaction.findOne({ number: req.params.invoiceNumber });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        return res.json(invoice);
    } catch (error) {
        console.error("Error getting invoice transaction:", error);
        return res.status(500).json({ message: "Failed to load invoice", error: error.message });
    }
}
