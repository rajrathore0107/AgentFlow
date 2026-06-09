import db from '../db/setup.js';
import { v4 as uuidv4 } from 'uuid';

export default class Execution {
  static async create({ pipelineId, userId, inputData = {} }) {
    const id = uuidv4();
    
    await db.query(`
      INSERT INTO executions (id, pipeline_id, user_id, status, input_data, started_at)
      VALUES (?, ?, ?, 'running', ?, CURRENT_TIMESTAMP)
    `, [id, pipelineId, userId, JSON.stringify(inputData)]);
    
    return this.findById(id);
  }

  static async findById(id) {
    const row = await db.queryOne(`
      SELECT e.*, p.name as pipeline_name 
      FROM executions e 
      JOIN pipelines p ON e.pipeline_id = p.id 
      WHERE e.id = ?
    `, [id]);
    
    if (row) {
      row.input_data = typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data;
      row.logs = typeof row.logs === 'string' ? JSON.parse(row.logs) : (row.logs || []);
    }
    return row;
  }

  static async findByUserId(userId, limit = 20) {
    const rows = await db.query(`
      SELECT e.*, p.name as pipeline_name 
      FROM executions e 
      JOIN pipelines p ON e.pipeline_id = p.id 
      WHERE e.user_id = ? 
      ORDER BY e.created_at DESC 
      LIMIT ?
    `, [userId, limit]);
    
    return rows.map(row => ({
      ...row,
      input_data: typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data,
      logs: typeof row.logs === 'string' ? JSON.parse(row.logs) : (row.logs || []),
    }));
  }

  static async updateStatus(id, status) {
    const updates = ['status = ?'];
    const values = [status];
    
    if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    values.push(id);
    const sql = `UPDATE executions SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return this.findById(id);
  }

  static async appendLog(id, logEntry) {
    const execution = await this.findById(id);
    if (!execution) return null;
    
    const logs = execution.logs || [];
    logs.push({ ...logEntry, timestamp: new Date().toISOString() });
    
    await db.query('UPDATE executions SET logs = ? WHERE id = ?', [JSON.stringify(logs), id]);
    return this.findById(id);
  }

  static async setOutput(id, outputData) {
    const data = typeof outputData === 'string' ? outputData : JSON.stringify(outputData);
    await db.query('UPDATE executions SET output_data = ? WHERE id = ?', [data, id]);
    return this.findById(id);
  }
}
