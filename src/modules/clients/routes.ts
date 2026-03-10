import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { clientRepository } from './repository';
import { authenticate } from '../auth/middleware';

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  segment: z.string().optional(),
  status: z.string().optional(),
  manager_id: z.number().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status, segment, page = '1', limit = '50' } = req.query;

    if (search) {
      const results = await clientRepository.search(search as string);
      return res.json({ data: results, total: results.length });
    }

    const filters: Record<string, any> = {};
    if (status) filters.status = status;
    if (segment) filters.segment = segment;

    const result = await clientRepository.findAll(filters, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await clientRepository.findById(parseInt(req.params.id, 10));
    if (!client) return res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = clientSchema.parse(req.body);
    const client = await clientRepository.create(data);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = clientSchema.partial().parse(req.body);
    const client = await clientRepository.update(parseInt(req.params.id, 10), data);
    if (!client) return res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await clientRepository.delete(parseInt(req.params.id, 10));
    if (!deleted) return res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
