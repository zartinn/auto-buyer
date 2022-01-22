const path = require('path');


module.exports = () => {
    return {
        resolve: {
            alias: {
                "@auto-buyer-shared": path.resolve('projects', 'auto-buyer-shared')
            }
        }
    };
}