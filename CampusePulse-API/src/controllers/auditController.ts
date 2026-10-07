import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';

export class AuditController {
  static async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity, entityId, action, limit } = req.query;
      const logs = await AuditService.getLogs({
        entity: entity ? String(entity) : undefined,
        entityId: entityId ? String(entityId) : undefined,
        action: action ? String(action) : undefined,
        limit: limit ? parseInt(String(limit), 10) : 100,
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}
