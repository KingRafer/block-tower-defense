/* MongoDB palsu di memori — hanya untuk pengujian lokal tanpa koneksi internet.
 * Mendukung subset operasi yang dipakai api/index.js. Aktifkan dengan MONGO_MODULE=./test/fake-mongodb.js */
'use strict';
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Date ? { $date: x.getTime() } : x))));
const val = v => (v && typeof v === 'object' && '$date' in v ? v.$date : v instanceof Date ? v.getTime() : v);

function match(doc, f) {
  for (const [k, cond] of Object.entries(f || {})) {
    if (k === '$or') { if (!cond.some(c => match(doc, c))) return false; continue; }
    const v = val(doc[k]);
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      for (const [op, x] of Object.entries(cond)) {
        if (op === '$in' && !x.map(val).includes(v)) return false;
        if (op === '$ne' && v === val(x)) return false;
        if (op === '$gt' && !(v > val(x))) return false;
        if (op === '$lt' && !(v < val(x))) return false;
      }
    } else if (v !== val(cond)) return false;
  }
  return true;
}
class Cursor {
  constructor(docs) { this.docs = docs; }
  sort(spec) { const [[k, dir]] = Object.entries(spec); this.docs.sort((a, b) => (val(a[k]) > val(b[k]) ? dir : val(a[k]) < val(b[k]) ? -dir : 0)); return this; }
  limit(n) { this.docs = this.docs.slice(0, n); return this; }
  async toArray() { return this.docs.map(clone); }
}
class Collection {
  constructor() { this.docs = []; this.uniques = []; }
  async createIndex(keys, opts = {}) { if (opts.unique) this.uniques.push({ keys: Object.keys(keys), sparse: opts.sparse }); return 'ok'; }
  checkUnique(doc, self) {
    for (const u of this.uniques) {
      if (u.sparse && u.keys.some(k => doc[k] === undefined)) continue;
      if (this.docs.some(d => d !== self && u.keys.every(k => val(d[k]) === val(doc[k])))) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    }
    if (doc._id !== undefined && this.docs.some(d => d !== self && d._id === doc._id)) throw Object.assign(new Error('E11000 dup _id'), { code: 11000 });
  }
  async insertOne(doc) { const d = clone(doc); if (d._id === undefined) d._id = Math.random().toString(36).slice(2); this.checkUnique(d); this.docs.push(d); return { insertedId: d._id }; }
  async insertMany(docs) { for (const d of docs) await this.insertOne(d); return { insertedCount: docs.length }; }
  async findOne(f) { const d = this.docs.find(x => match(x, f)); return d ? clone(d) : null; }
  find(f) { return new Cursor(this.docs.filter(x => match(x, f))); }
  async countDocuments(f) { return this.docs.filter(x => match(x, f)).length; }
  async updateOne(f, upd) {
    const d = this.docs.find(x => match(x, f)); if (!d) return { matchedCount: 0 };
    const next = { ...d };
    for (const [k, v] of Object.entries(upd.$set || {})) next[k] = clone(v);
    for (const [k, v] of Object.entries(upd.$push || {})) next[k] = [...(next[k] || []), clone(v)];
    this.checkUnique(next, d); Object.assign(d, next);
    return { matchedCount: 1 };
  }
  async deleteOne(f) { const i = this.docs.findIndex(x => match(x, f)); if (i >= 0) this.docs.splice(i, 1); return { deletedCount: i >= 0 ? 1 : 0 }; }
  async deleteMany(f) { const n = this.docs.length; this.docs = this.docs.filter(x => !match(x, f)); return { deletedCount: n - this.docs.length }; }
}
const dbs = {};
class MongoClient {
  constructor() {}
  async connect() { return this; }
  db(name) { const store = dbs[name] || (dbs[name] = {}); return { collection: n => store[n] || (store[n] = new Collection()) }; }
}
module.exports = { MongoClient };
