import { getDb } from '../database/firestore';
import { AuditLog } from '../types';

export interface LogActionParams {
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  static async logAction(params: LogActionParams): Promise<AuditLog> {
    const db = getDb();
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logData: AuditLog = {
      id: logId,
      userId: params.userId,
      userName: params.userName || 'System',
      userRole: params.userRole || 'admin',
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
      metadata: params.metadata || {},
    };

    try {
      await db.collection('auditLogs').doc(logId).set(logData);
    } catch (err) {
      console.error('Audit log write failed:', err);
    }

    return logData;
  }

  static async getLogs(filters: {
    entity?: string;
    entityId?: string;
    action?: string;
    limit?: number;
  } = {}): Promise<AuditLog[]> {
    const db = getDb();
    let query = db.collection('auditLogs');

    if (filters.entity) {
      query = query.where('entity', '==', filters.entity);
    }
    if (filters.entityId) {
      query = query.where('entityId', '==', filters.entityId);
    }
    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').limit(filters.limit || 100).get();
    return snapshot.docs.map((doc: any) => doc.data() as AuditLog);
  }
}
