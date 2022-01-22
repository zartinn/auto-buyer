const fetch = require('node-fetch');
fetch("https://gethatch.com/iceleads_rest/merch/4001/go?partner=deicecat&region=DE&affiliate_id=52439&prod_id=962568267&core_id=100514071").then(res => {
    console.log(res.url);
})