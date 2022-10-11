import { readFile } from 'fs/promises';

const packageJson = await readFile('./package.json', 'utf-8');

const packageJsonObj = JSON.parse(packageJson);
const version = packageJsonObj.version;
console.log(`export const PACKAGE_VERSION = "${version}";`);
console.error('package.json version:', version);
