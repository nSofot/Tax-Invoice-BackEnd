import express from "express";
import { createItem, deleteItem, getItems, updateItem } from "../controllers/itemController.js";

const itemRouter = express.Router();
itemRouter.get("/", getItems);
itemRouter.post("/", createItem);
itemRouter.put("/:itemId", updateItem);
itemRouter.delete("/:itemId", deleteItem);

export default itemRouter;
