"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactController_1 = require("../controllers/contactController");
const router = (0, express_1.Router)();
// Public route
router.post('/', contactController_1.ContactController.submitContact);
exports.default = router;
