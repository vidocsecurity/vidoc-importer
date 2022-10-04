# What it does?

It fetches data bug bounty platforms, public data is fetched from [bounty targets](https://github.com/arkadiyt/bounty-targets-data/tree/master/data). Bug bounty platforms we use:
- HackerOne
- Bugcrowd
- Intigriti
- HackerProof
- Federacy
- YESWEHACK

We also fetch info about private programs from:
- HackerOne
- Intigriti

Its fetches the data and parses it into one format. It even parse descriptions of scope items and tries to get data from there.

# What data we parse?

- domains
- subdomains
- github/gitlab urls
- android/ios mobile application urls
- urls to binaries
- paths from urls
- ip addresses and CIDRs

# How to run it locally?

It requires a couple of arguments to run:

(intigriti account has to have 2fa disabled)
```bash
INTIGRITI_EMAIL=<email>
```

```bash
INTIGRITI_PASSWORD=<password>
```

```bash
HACKERONE_SESSION_COOKIE=<value of __Host-session cookie from hackerone>
```
Note, the **__Host-session** cookie changes every 2 week.

To start emulator locally run:
```bash
INTIGRITI_EMAIL=email INTIGRITI_PASSWORD=pass HACKERONE_SESSION_COOKIE=cookie yarn serve
```