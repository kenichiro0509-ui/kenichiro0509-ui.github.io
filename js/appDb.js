(() => {
    const DB_NAME = 'slottracker-db';
    const DB_VERSION = 2;
    const STORES = ['visits', 'plays', 'recentSelections'];
    let dbPromise;

    function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const name of STORES) {
                    if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                db.onversionchange = () => {
                    db.close();
                    dbPromise = undefined;
                };
                resolve(db);
            };
            request.onerror = () => {
                dbPromise = undefined;
                reject(request.error);
            };
        });
        return dbPromise;
    }

    async function requestResult(name, mode, operation) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(name, mode);
            const store = tx.objectStore(name);
            let request;
            try { request = operation(store); }
            catch (e) { reject(e); return; }
            if (request) {
                request.onsuccess = () => resolve(request.result ?? null);
                request.onerror = () => reject(request.error);
            } else {
                tx.oncomplete = () => resolve();
            }
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    window.slotDb = {
        getAll: async (name) => (await requestResult(name, 'readonly', store => store.getAll())) || [],
        get: async (name, id) => await requestResult(name, 'readonly', store => store.get(id)),
        put: async (name, value) => await requestResult(name, 'readwrite', store => store.put(value)),
        delete: async (name, id) => await requestResult(name, 'readwrite', store => store.delete(id)),
        clear: async (name) => await requestResult(name, 'readwrite', store => store.clear())
    };

    window.slotUi = {
        confirm: (message) => window.confirm(message),
        downloadText: (fileName, text, contentType = 'text/plain;charset=utf-8') => {
            const blob = new Blob([text], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    };
})();
