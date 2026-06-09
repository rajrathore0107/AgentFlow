import db from '../db/setup.js';
import { v4 as uuidv4 } from 'uuid';

export default class Pipeline {
  static async create({ userId, name, description = '', workflowJson = {} }) {
    const id = uuidv4();
    
    await db.query(`
      INSERT INTO pipelines (id, user_id, name, description, workflow_json)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userId, name, description, JSON.stringify(workflowJson)]);
    
    return this.findById(id);
  }

  static async findById(id) {
    const row = await db.queryOne('SELECT * FROM pipelines WHERE id = ?', [id]);
    if (row) {
      row.workflow_json = typeof row.workflow_json === 'string' ? JSON.parse(row.workflow_json) : row.workflow_json;
    }
    return row;
  }

  static async findByUserId(userId) {
    const rows = await db.query('SELECT * FROM pipelines WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
    return rows.map(row => ({
      ...row,
      workflow_json: typeof row.workflow_json === 'string' ? JSON.parse(row.workflow_json) : row.workflow_json,
    }));
  }

  static async update(id, { name, description, workflowJson, status }) {
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (workflowJson !== undefined) { updates.push('workflow_json = ?'); values.push(JSON.stringify(workflowJson)); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) return this.findById(id); // only updated_at

    values.push(id);
    const sql = `UPDATE pipelines SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, values);
    return this.findById(id);
  }

  static async delete(id) {
    return db.query('DELETE FROM pipelines WHERE id = ?', [id]);
  }

  static async countByUserId(userId) {
    const row = await db.queryOne('SELECT COUNT(*) as count FROM pipelines WHERE user_id = ?', [userId]);
    return parseInt(row.count || 0, 10);
  }
}
