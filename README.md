# Description

This is a tool developed by https://www.vidocsecurity.com/ that is used for importing data to the Vidoc Research platform. Currently we only support importing bug bounty programs and information about them from different platforms.

# How to import bug bounty programs

1. Install the tool

```
npm install @vidocsecurity/vidoc-importer -g
```

2. Generate access token on the platform `API settings -> Create new token`
3. Login with the tool using token you generated `vidoc-importer login --token TOKEN`
4. Import private programs from h1: `vidoc-importer import hackerone-private --session-cookie (cookie __Host-session z hackerone)`
5. You can also import ALL public programs from all of the platforms (h1, bugcrowd, intigriti, yeswehack…) using command `vidoc-importer import all-public`

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

Note. Not all this data is suported on our platform, but it will be in the future. If you are interested in any of those features let us know: contact@vidocsecurity.com
