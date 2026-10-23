import mongoose from "mongoose";

const invoiceLineSchema = new mongoose.Schema(
    {
        description: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 0.01 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const invoiceTransactionSchema = new mongoose.Schema(
    {
        number: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        supplierTin: { type: String, default: "", trim: true },
        supplierName: { type: String, required: true, trim: true },
        supplierAddress: { type: String, default: "", trim: true },
        supplierPhone: { type: String, default: "", trim: true },
        buyerTin: { type: String, default: "", trim: true },
        buyerName: { type: String, required: true, trim: true },
        buyerAddress: { type: String, default: "", trim: true },
        buyerPhone: { type: String, default: "", trim: true },
        vehicle: { type: String, default: "", trim: true },
        reference: { type: String, default: "", trim: true },
        payment: { type: String, required: true, trim: true },
        lines: {
            type: [invoiceLineSchema],
            required: true,
            validate: { validator: (lines) => lines.length > 0, message: "At least one invoice item is required" },
        },
        subTotal: { type: Number, required: true, min: 0 },
        vat: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        words: { type: String, default: "" },
    },
    { timestamps: true }
);

invoiceTransactionSchema.index(
    { number: 1 },
    { unique: true, partialFilterExpression: { number: { $type: "string" } } }
);

const InvoiceTransaction = mongoose.model("InvoiceTransaction", invoiceTransactionSchema);

export default InvoiceTransaction;
