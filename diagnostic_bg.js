
async function checkBgData() {
    return new Promise((resolve) => {
        const request = indexedDB.open('Innova4UpDB');
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['companies'], 'readonly');
            const store = transaction.objectStore('companies');
            const getAll = store.getAll();
            getAll.onsuccess = () => {
                const companies = getAll.result;
                console.table(companies.map(c => ({
                    name: c.name,
                    bg_len: c.loginBgData ? c.loginBgData.length : 0,
                    bg_prefix: c.loginBgData ? c.loginBgData.substring(0, 50) : 'N/A'
                })));
                resolve(companies);
            };
        };
    });
}
checkBgData();
