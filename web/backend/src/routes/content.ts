import { Router } from 'express';
import * as contentController from '../controllers/contentController.js';

export const contentRouter = Router();

contentRouter.post('/', contentController.create);
contentRouter.get('/', contentController.list);
contentRouter.get('/:id', contentController.getById);
contentRouter.put('/:id', contentController.update);
contentRouter.delete('/:id', contentController.remove);
