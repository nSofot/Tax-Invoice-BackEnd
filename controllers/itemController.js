import mongoose from "mongoose";
import Item from "../models/item.js";
import { isAdmin } from "./userController.js";

function pickItemFields(body) {
    const fields = {};
    if (body.name !== undefined) fields.name = String(body.name).trim();
    if (body.price !== undefined) fields.price = Number(body.price);
    return fields;
}

function validateItem(item) {
    if (item.name !== undefined && !item.name) return "Item name is required";
    if (item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0)) return "Price must be a non-negative number";
    return "";
}

export async function getItems(req, res) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
        return res.json(await Item.find().sort({ name: 1 }));
    } catch (error) {
        return res.status(500).json({ message: "Error getting items", error: error.message });
    }
}

export async function createItem(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "You are not authorized to add items" });
    const itemData = pickItemFields(req.body);
    const validationError = validateItem(itemData);
    if (!itemData.name || itemData.price === undefined || validationError) {
        return res.status(400).json({ message: validationError || "Item name and price are required" });
    }
    try {
        const item = await Item.create(itemData);
        return res.status(201).json({ message: "Item added", item });
    } catch (error) {
        return res.status(500).json({ message: "Item not added", error: error.message });
    }
}

export async function updateItem(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "You are not authorized to update items" });
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) return res.status(400).json({ message: "Invalid item ID" });
    const itemData = pickItemFields(req.body);
    if (!Object.keys(itemData).length) return res.status(400).json({ message: "Provide an item name or price to update" });
    const validationError = validateItem(itemData);
    if (validationError) return res.status(400).json({ message: validationError });
    try {
        const item = await Item.findByIdAndUpdate(itemId, { $set: { ...itemData, updatedAt: new Date() } }, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ message: "Item not found" });
        return res.json({ message: "Item updated successfully", item });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update item", error: error.message });
    }
}

export async function deleteItem(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ message: "You are not authorized to delete items" });
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) return res.status(400).json({ message: "Invalid item ID" });
    try {
        const item = await Item.findByIdAndDelete(itemId);
        if (!item) return res.status(404).json({ message: "Item not found" });
        return res.json({ message: "Item deleted successfully", item });
    } catch (error) {
        return res.status(500).json({ message: "Failed to delete item", error: error.message });
    }
}
