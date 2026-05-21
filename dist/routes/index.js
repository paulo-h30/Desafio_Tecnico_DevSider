"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const contact_controller_1 = __importDefault(require("../controllers/contact.controller"));
const campaign_controller_1 = __importDefault(require("../controllers/campaign.controller"));
const flow_controller_1 = __importDefault(require("../controllers/flow.controller"));
const system_controller_1 = __importDefault(require("../controllers/system.controller"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// Sistema
router.post('/system/reset', system_controller_1.default.reset);
router.get('/system/queue', system_controller_1.default.getQueueStatus);
// Contatos
router.post('/contacts/import', upload.single('file'), contact_controller_1.default.importContacts);
router.post('/contacts/manual', contact_controller_1.default.addManualContact);
router.get('/lists', contact_controller_1.default.listLists);
router.get('/lists/:listId/contacts', contact_controller_1.default.listContactsByList);
router.delete('/lists/:listId', contact_controller_1.default.deleteList);
// Campanhas
router.post('/campaigns', campaign_controller_1.default.create);
router.get('/campaigns', campaign_controller_1.default.list);
router.post('/campaigns/start', campaign_controller_1.default.start);
// Fluxos
router.post('/flows', flow_controller_1.default.create);
router.get('/flows', flow_controller_1.default.list);
router.post('/flows/:flowId/steps', flow_controller_1.default.addStep);
router.post('/flows/start', flow_controller_1.default.startFlowForList);
exports.default = router;
