// Mock edb.js
module.exports = new Proxy({}, {
    get: function(target, prop) {
        if (prop === 'connect') return async () => true;
        return async (...args) => ({ 
            wallet: 0, bank: 0, bankCapacity: 0, cd: false, 
            invalid: false, noten: false, full: false, 
            invalidCrime: false, success: false, notfound: false, 
            noItems: false, insufficient: false, has: 0 
        });
    }
});
