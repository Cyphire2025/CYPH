
import dns from 'dns';

console.log('Resolving _mongodb._tcp.cluster0.ed51bbf.mongodb.net ...');
dns.resolveSrv('_mongodb._tcp.cluster0.ed51bbf.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('Error resolving SRV:', err);
    } else {
        console.log('SRV Records:', addresses);
    }
});

console.log('Resolving cluster0.ed51bbf.mongodb.net ...');
dns.lookup('cluster0.ed51bbf.mongodb.net', (err, address, family) => {
    if (err) {
        console.error('Error looking up host:', err);
    } else {
        console.log('Host address:', address);
    }
});
