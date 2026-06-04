import db from '../db/setup.js';
import { v4 as uuidv4 } from 'uuid';

export default class Execution {
  static create({ pipelineId, userId, inputData = {} }) {
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO executions (id, pipeline_id, user_id, status, input_data, started_at)
      VALUES (?, ?, ?, 'running', ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(id, pipelineId, userId, JSON.stringify(inputData));
    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT e.*, p.name as pipeline_name 
      FROM executions e 
      JOIN pipelines p ON e.pipeline_id = p.id 
      WHERE e.id = ?
    `);
    const row = stmt.get(id);
    if (row) {
      row.input_data = JSON.parse(row.input_data);
      row.logs = JSON.parse(row.logs);
    }
    return row;
  }

  static findByUserId(userId, limit = 20) {
    const stmt = db.prepare(`
      SELECT e.*, p.name as pipeline_name 
      FROM executions e 
      JOIN pipelines p ON e.pipeline_id = p.id 
      WHERE e.user_id = ? 
      ORDER BY e.created_at DESC 
      LIMIT ?
    `);
    const rows = stmt.all(userId, limit);
    return rows.map(row => ({
      ...row,
      input_data: JSON.parse(row.input_data),
      logs: JSON.parse(row.logs),
    }));
  }

  static updateStatus(id, status) {
    const updates = ['status = ?'];
    const values = [status];
    
    if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    values.push(id);
    const stmt = db.prepare(`UPDATE executions SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  static appendLog(id, logEntry) {
    const execution = this.findById(id);
    if (!execution) return null;
    
    const logs = execution.logs || [];
    logs.push({ ...logEntry, timestamp: new Date().toISOString() });
    
    const stmt = db.prepare('UPDATE executions SET logs = ? WHERE id = ?');
    stmt.run(JSON.stringify(logs), id);
    return this.findById(id);
  }

  static setOutput(id, outputData) {
    const stmt = db.prepare('UPDATE executions SET output_data = ? WHERE id = ?');
    stmt.run(typeof outputData === 'string' ? outputData : JSON.stringify(outputData), id);
    return this.findById(id);
  }
}
