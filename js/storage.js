/**
 * Local storage manager for saved JSON entries
 */
const Storage = {
  STORAGE_KEY: 'jsnap-saved',

  getAll() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  save(name, jsonString) {
    const items = this.getAll();
    items.unshift({
      id: Date.now().toString(36),
      name,
      json: jsonString,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return items;
  },

  rename(id, newName) {
    const items = this.getAll();
    const item = items.find(i => i.id === id);
    if (item) {
      item.name = newName;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    }
    return items;
  },

  remove(id) {
    const items = this.getAll().filter(item => item.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return items;
  },

  count() {
    return this.getAll().length;
  }
};
