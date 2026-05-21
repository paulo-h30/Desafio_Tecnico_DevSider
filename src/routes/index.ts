import { Router } from 'express';
import multer from 'multer';
import contactController from '../controllers/contact.controller';
import campaignController from '../controllers/campaign.controller';
import flowController from '../controllers/flow.controller';
import systemController from '../controllers/system.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Sistema
router.post('/system/reset', systemController.reset);
router.get('/system/queue', systemController.getQueueStatus);

// Contatos
router.post('/contacts/import', upload.single('file'), contactController.importContacts);
router.post('/contacts/manual', contactController.addManualContact);
router.get('/lists', contactController.listLists);
router.get('/lists/:listId/contacts', contactController.listContactsByList);
router.delete('/lists/:listId', contactController.deleteList);

// Campanhas
router.post('/campaigns', campaignController.create);
router.get('/campaigns', campaignController.list);
router.post('/campaigns/start', campaignController.start);

// Fluxos
router.post('/flows', flowController.create);
router.get('/flows', flowController.list);
router.post('/flows/:flowId/steps', flowController.addStep);
router.post('/flows/start', flowController.startFlowForList);

export default router;
