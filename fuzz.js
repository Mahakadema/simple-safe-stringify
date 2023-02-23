
import { stringifySafe } from "./index.js";
import assert from "assert";
import { inspect } from "util";

const leafChance = 0.5;
const objectLeafWeight = 5;
const numLeafWeight = 5;
const stringLeafWeight = 3;
const bigintLeafWeight = 2;
const arrayChance = 0.5;
const lengthPhi = 0.4;

function randomChance(chance) {
    return Math.random() < chance;
}

function randomExp(chanceOfFirst, c = 0) {
    return randomChance(chanceOfFirst) ? c : randomExp(chanceOfFirst, c + 1);
}

function randomLeaf(generated) {
    let rdm = Math.random() * (objectLeafWeight + numLeafWeight + stringLeafWeight + bigintLeafWeight);
    if (rdm < objectLeafWeight) {
        return generated[Math.floor(Math.random() * generated.length)] ?? null;
    } else {
        rdm -= objectLeafWeight;
    }
    if (rdm < numLeafWeight) {
        return Math.floor(Math.random() * 20);
    } else {
        rdm -= numLeafWeight
    }
    if (rdm < stringLeafWeight) {
        return Array.from({ length: 12 }, (_, i) => "abcdef"[Math.floor(Math.random() * 5)]).join("");
    } else {
        rdm -= stringLeafWeight;
    }
    if (rdm < bigintLeafWeight) {
        return BigInt(Math.floor(Math.random() * 20));
    } else {
        rdm -= bigintLeafWeight;
        throw new Error(`Invalid rdm ${rdm}`);
    }
}

function numToCode(num) {
    return (num >= 26 ? numToCode(Math.floor(num / 26)) : "") + (num % 26 + 10).toString(36);
}

function generateObject() {
    const root = { '': null };
    const generated = [];

    const queue = [{ obj: root, k: '' }];

    while (queue.length) {
        const next = queue.shift();
        if (randomChance(leafChance)) {
            // generate a leaf at the specific location
            next.obj[next.k] = randomLeaf(generated);
        } else if (randomChance(arrayChance)) {
            const arr = [];
            generated.push(arr);
            next.obj[next.k] = arr;
            queue.push(...Array.from({ length: randomExp(lengthPhi) }, (_, i) => i).map(v => ({ obj: arr, k: v })));
        } else {
            const obj = {};
            generated.push(obj);
            next.obj[next.k] = obj;
            queue.push(...Array.from({ length: randomExp(lengthPhi) }, (_, i) => numToCode(i)).map(v => ({ obj: obj, k: v })));
        }
    }

    return root[''];
}

function log(...msgs) {
    console.log(...msgs.map(v => typeof v === "string" ? v : inspect(v, false, null, true)));
}

function fuzz() {
    while(true) {
        const obj = generateObject();
        log(obj);
        let expected = inspect(obj, false, null, false)
            .replace(/<ref \*\d+> /g, "") // get rid of the refs
            .replace(/'/g, '"') // use same quotes
            .replace(/\[Circular \*(\d+)\]/g, '"[CIRCULAR #$1]"') // replace circulars with JSON texts
            .replace(/(\d+)n/g, '"$1"') // stringify bigints
            .replace(/(\w+):/g, '"$1":') // stringify property keys
            .replace(/\n?\s(?!#)/g, "") // remove spaces
        const stringified = stringifySafe(obj, null, null, null, null);
        log(stringified, expected);
        assert.strictEqual(stringified, expected);
    }
}

fuzz();
