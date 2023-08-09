# How to Install
```bash
  npm install express body-parser child_process
```
## How to Run
```bash
ipset create whitelist_next hash:net family inet hashsize 134217728 maxelem 99999999
ipset create blacklist_next hash:net family inet hashsize 134217728 maxelem 99999999

iptables -t raw -A PREROUTING -m set --match-set whitelist_next src -j ACCEPT
iptables -t raw -A PREROUTING -m set --match-set blacklist_next src -j DROP

node index.js
```
