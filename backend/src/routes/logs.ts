// =============================================================================
// logs.ts — GET /api/intake-logs
// =============================================================================
// Returns paginated IntakeLog records for the frontend dashboard table.
// Ordered by most recent first (createdAt DESC).
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import type { ApiResponse } from '../types/api.types';
import { IntakeLog } from '@prisma/client';

const router = Router();

interface LogsResult {
  logs: IntakeLog[];
  total: number;
}

// GET /api/intake-logs?limit=20&offset=0
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit  = Math.min(parseInt(String(req.query['limit']  ?? '20'), 10), 100);
      const offset = parseInt(String(req.query['offset'] ?? '0'),  10);

      const [logs, total] = await Promise.all([
        prisma.intakeLog.findMany({
          orderBy: { createdAt: 'desc' },
          take:    limit,
          skip:    offset,
        }),
        prisma.intakeLog.count(),
      ]);

      const body: ApiResponse<LogsResult> = {
        success: true,
        data: { logs, total },
      };

      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
