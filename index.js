
/**
 * Safely stringifies any data to JSON
 * If the replacer would never terminate under JSON.stringify, it also will never terminate here.
 * If the recursionReplacer would throw or never terminate under JSON.stringify, it will do the same here.
 * Make sure to avoid faulty input functions.
 * @param {any} data The data to stringify
 * @param {(k: string, v: any) => any} replacer The replacer to apply. Works just like a function in JSON.stringify
 * @param {(v: any, circle: { key: string, value: any }[]) => any} recursionReplacer Called upon finding a circular dependency, the first argument is the end of the circle, the second argument contains all steps of the circle, from the end to the beginning.
 * @param {boolean} [convertBigInt=true] Whether to convert bigints to strings. Trying to stringify bigints will throw, defaults to true
 * @param {string | number} [space] 
 */
export function stringifySafe(data, replacer, recursionReplacer, convertBigInt, space) {
    return JSON.stringify(data, getSafeReplacer(replacer, recursionReplacer, convertBigInt), space);
}

export default stringifySafe;

/**
 * Creates a replacer rule to parse circular dependencies in objects.
 * If the replacer would never terminate under JSON.stringify, it also will never terminate here.
 * If the recursionReplacer would throw or never terminate under JSON.stringify, it will do the same here.
 * Make sure to avoid faulty input functions.
 * The function returned by this has state and should only be used once.
 * @param {(k: string, v: any) => any} [replacer] The replacer to apply. Works just like a function in JSON.stringify
 * @param {(keys: string[], v: any) => any} [recursionReplacer] Called upon finding a circular dependency, the first argument is the keys needed to get from the first object of the circle to itself again, the second argument is the first object of the circle (after being passed to the replacer)
 * @param {boolean} [convertBigInt=true] Whether to convert bigints to strings. Trying to stringify bigints will throw, defaults to true
 * @returns {(k, v) => any}
 */
export function getSafeReplacer(replacer, recursionReplacer, convertBigInt) {
    /**
     * @type {Map<any, { obj: any, k: string }>} key is the object found, value is the p
     */
    const map = new Map();

    replacer ??= (_, v) => v;
    recursionReplacer ??= (() => {
        let i = 0;
        const indexes = new Map();
        return (_, v) => {
            let idx = indexes.get(v);
            if (!idx) {
                indexes.set(v, ++i);
                idx = i;
            }
            return `[CIRCULAR #${idx}]`;
        };
    })();
    convertBigInt ??= true;

    /**
     * A replacer that replaces circular structures with a safe value
     * @param {string} k
     * @param {any} v
     */
    return function safeReplacer(k, val) {
        const v = replacer.bind(this, k, val)();

        // v is not an object, return as is
        if (!(typeof v === "object" && v)) {
            return convertBigInt ? stringifyBigInt(v) : v;
        }

        const entry = map.get(v);
        const newPointer = { obj: this, k: k };

        // never seen object, add to known list
        if (!entry) {
            map.set(v, newPointer);
            return v;
        }

        // build up stack of objects higher up in the hierarchy
        const stack = [];
        let ptr = newPointer;
        // console.log("S", v);
        // console.log("L", ptr);
        while (ptr) {
            stack.push({ key: ptr.k, value: ptr.obj });
            // object is circular, replace with flat value
            if (v === ptr.obj)
                return (convertBigInt ? stringifyBigInt : v => v)(recursionReplacer(stack.map(v => v.key).reverse(), v));
            ptr = map.get(ptr.obj);
            // console.log("L", ptr);
        }

        // no circular shenanigans found, object is safe
        map.set(v, newPointer); // set ref of object to highest appearance in stack
        return v;
    }
}

function stringifyBigInt(v) {
    if (typeof v === "bigint")
        return v.toString();
    return v;
}
