// Mock db.js
module.exports = new Proxy({}, {
    get: function(target, prop) {
        if (prop === 'warn') {
            return {
                addWarn: async () => ({ warning: 1 }),
                getWarns: async () => 0,
                clearWarns: async () => true,
                removeWarn: async () => true
            };
        }
        return async (...args) => true;
    }
});
