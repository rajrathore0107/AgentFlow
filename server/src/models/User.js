import db from '../db/setup.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default class User {
  static create({ email, username, password }) {
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    
    const stmt = db.prepare(`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, email.toLowerCase(), username, passwordHash);
    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase());
  }

  static findByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
}
