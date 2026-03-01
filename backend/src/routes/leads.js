import { Router } from 'express';
import * as leadController from '../controllers/leadController.js';
import * as timelineController from '../controllers/timelineController.js';
import * as aiFollowupController from '../controllers/aiFollowupController.js';

const router = Router();

router.get('/', leadController.list);
router.post('/', leadController.create);
router.get('/:id/timeline', timelineController.get);
router.post('/:id/ai-followup', aiFollowupController.generate);
router.get('/:id', leadController.getById);
router.patch('/:id', leadController.update);
router.delete('/:id', leadController.remove);

export default router;
