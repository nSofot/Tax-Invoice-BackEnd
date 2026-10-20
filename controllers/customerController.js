import mongoose from "mongoose";
import Customer from "../models/customer.js";
import { isAdmin } from "./userController.js";

const customerFields = ["name", "tin", "address", "phone"];

function pickCustomerFields(body) {
    return Object.fromEntries(
        customerFields
            .filter((field) => body[field] !== undefined)
            .map((field) => [field, typeof body[field] === "string" ? body[field].trim() : body[field]])
    );
}

export async function CreateCustomer(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to add customers" });
    }

    const customerData = pickCustomerFields(req.body);
    if (!customerData.name) {
        return res.status(400).json({ message: "Customer name is required" });
    }

    try {
        const customer = await Customer.create(customerData);
        return res.status(201).json({ message: "Customer added", customer });
    } catch (error) {
        console.error("Error saving customer:", error);
        return res.status(500).json({ message: "Customer not added", error: error.message });
    }
}

export async function getCustomer(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const customers = await Customer.find().sort({ name: 1 });
        return res.json(customers);
    } catch (error) {
        return res.status(500).json({ message: "Error getting customers", error: error.message });
    }
}

export async function getCustomerById(req, res) {
    const { customerId } = req.params;
    if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.json(customer);
    } catch (error) {
        return res.status(500).json({ message: "Error getting customer", error: error.message });
    }
}

export async function updateCustomer(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to update customers" });
    }

    const { customerId } = req.params;
    if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customerData = pickCustomerFields(req.body);
    if (Object.keys(customerData).length === 0) {
        return res.status(400).json({ message: "Provide at least one customer field to update" });
    }
    if (customerData.name !== undefined && !customerData.name) {
        return res.status(400).json({ message: "Customer name cannot be empty" });
    }

    try {
        const customer = await Customer.findByIdAndUpdate(
            customerId,
            { $set: { ...customerData, updatedAt: new Date() } },
            { new: true, runValidators: true }
        );
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.json({ message: "Customer updated successfully", customer });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update customer", error: error.message });
    }
}

export async function deleteCustomer(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized to delete customers" });
    }

    const { customerId } = req.params;
    if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
        const customer = await Customer.findByIdAndDelete(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.json({ message: "Customer deleted successfully", customer });
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete customer", error: error.message });
    }
}

export async function searchCustomers(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const searchQuery = String(req.query.query || "").trim();
    try {
        const filter = searchQuery
            ? {
                $or: ["name", "tin", "address", "phone"].map((field) => ({
                    [field]: { $regex: searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
                })),
            }
            : {};
        const customers = await Customer.find(filter).sort({ name: 1 });
        return res.json(customers);
    } catch (error) {
        console.error("Error searching customers:", error);
        return res.status(500).json({ message: "Error searching customers", error: error.message });
    }
}
