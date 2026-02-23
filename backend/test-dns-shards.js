
import dns from 'dns';

const hosts = [
    'cluster0-shard-00-00.ed51bbf.mongodb.net',
    'cluster0-shard-00-01.ed51bbf.mongodb.net',
    'cluster0-shard-00-02.ed51bbf.mongodb.net'
];

hosts.forEach(host => {
    console.log(`Resolving ${host} ...`);
    dns.lookup(host, (err, address) => {
        if (err) {
            console.error(`Error resolving ${host}:`, err.code);
        } else {
            console.log(`Success ${host}: ${address}`);
        }
    });
});
