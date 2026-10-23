import InvoiceTransaction from "../models/invoiceTransaction.js";

const roundMoney = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;
const regexEscape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const titleCaseWords = (value) => String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());

function invoicePrefixForDate(date) {
    const year = String(date.getUTCFullYear()).slice(-2);
    const month = date.toLocaleString("en", { month: "short", timeZone: "UTC" }).toUpperCase();
    return `${year}${month}_ACF_`;
}

async function getNextInvoiceNumberForDate(date) {
    const prefix = invoicePrefixForDate(date);
    const latestInvoice = await InvoiceTransaction.findOne({ number: { $regex: `^${prefix}\\d{6}$` } })
        .sort({ number: -1 })
        .select({ number: 1 })
        .lean();
    const lastSequence = latestInvoice ? Number(latestInvoice.number.slice(-6)) : 0;
    if (lastSequence >= 999999) throw new Error(`Invoice sequence for ${prefix.slice(0, 5)} is full`);
    return `${prefix}${String(lastSequence + 1).padStart(6, "0")}`;
}

export async function previewNextInvoiceNumber(req, res) {
    if (!req.user) return res.status(401).json({ message: "Please login to create an invoice" });
    const date = new Date(req.query.date);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "A valid invoice date is required" });
    try {
        return res.json({ number: await getNextInvoiceNumberForDate(date) });
    } catch (error) {
        return res.status(400).json({ message: error.message || "Could not generate invoice number" });
    }
}

export async function createInvoiceTransaction(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Please login to create an invoice" });
    }

    const body = req.body || {};
    const date = new Date(body.date);
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
        const inclusiveAmount = roundMoney(quantity * unitPrice);
        const netUnitPrice = roundMoney(unitPrice * 100 / 118);
        const netAmount = roundMoney(inclusiveAmount * 100 / 118);
        lines.push({ description, quantity, unitPrice: netUnitPrice, amount: netAmount });
    }

    const subTotal = roundMoney(lines.reduce((sum, item) => sum + item.amount, 0));
    const total = roundMoney((body.lines || []).reduce((sum, item) => sum + roundMoney(Number(item.quantity) * Number(item.unitPrice)), 0));
    const vat = roundMoney(total - subTotal);

    try {
        let invoice;
        for (let attempt = 0; attempt < 10 && !invoice; attempt += 1) {
            const number = await getNextInvoiceNumberForDate(date);
            try {
                invoice = await InvoiceTransaction.create({
                    number,
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
                    vat,
                    total,
                    words: titleCaseWords(body.words || ""),
                });
            } catch (error) {
                if (error.code === 11000 && attempt < 9) continue;
                throw error;
            }
        }
        if (!invoice) return res.status(409).json({ message: "Could not reserve the next invoice number. Please try again." });
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
