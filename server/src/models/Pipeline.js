import db from '../db/setup.js';
import { v4 as uuidv4 } from 'uuid';

export default class Pipeline {
  static create({ userId, name, description = '', workflowJson = {} }) {
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO pipelines (id, user_id, name, description, workflow_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, name, description, JSON.stringify(workflowJson));
    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM pipelines WHERE id = ?');
    const row = stmt.get(id);
    if (row) {
      row.workflow_json = JSON.parse(row.workflow_json);
    }
    return row;
  }

  static findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM pipelines WHERE user_id = ? ORDER BY updated_at DESC');
    const rows = stmt.all(userId);
    return rows.map(row => ({
      ...row,
      workflow_json: JSON.parse(row.workflow_json),
    }));
  }

  static update(id, { name, description, workflowJson, status }) {
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (workflowJson !== undefined) { updates.push('workflow_json = ?'); values.push(JSON.stringify(workflowJson)); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 1) return this.findById(id); // only updated_at

    values.push(id);
    const stmt = db.prepare(`UPDATE pipelines SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM pipelines WHERE id = ?');
    return stmt.run(id);
  }

  static countByUserId(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines WHERE user_id = ?');
    return stmt.get(userId).count;
  }
}
