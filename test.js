
import stringifySafe, { getSafeReplacer } from "./index.js";
import assert from "assert";

async function test(name, fn) {
    let res;
    try {
        res = await fn();
        if (res === undefined) {
            console.log(`[PASSED] ${name}`);
        } else {
            console.log(`[PASSED] ${name}:`, res);
        }
    } catch (e) {
        console.log(`[FAILED] ${name}:`, e);
    }
}

function s(v, replacer, space) {
    return JSON.stringify(v, replacer, space);
}

await test("Non-recursive object", () => {
    const expected = s({ a: "b" });
    const actual = stringifySafe({ a: "b" });
    assert.strictEqual(actual, expected);
});

await test("Null", () => {
    const expected = s(null);
    const actual = stringifySafe(null);
    assert.strictEqual(actual, expected);
});

await test("Number", () => {
    const expected = s(1337);
    const actual = stringifySafe(1337);
    assert.strictEqual(actual, expected);
});

await test("String", () => {
    const expected = s("We have been trying to reach you about your car's extended warranty");
    const actual = stringifySafe("We have been trying to reach you about your car's extended warranty");
    assert.strictEqual(actual, expected);
});

await test("BigInt", () => {
    const expected = s("12345678901234567891234567890123456789");
    const actual = stringifySafe(BigInt("12345678901234567891234567890123456789"));
    assert.strictEqual(actual, expected);
});

await test("Object with bigint", () => {
    const expected = s({ a: "1234567890123456789" });
    const actual = stringifySafe({ a: BigInt("1234567890123456789") });
    assert.strictEqual(actual, expected);
});

await test("Simple recursion", () => {
    const expected = s({ a: "[CIRCULAR #1]" });
    const obj = { a: null };
    obj.a = obj;
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("Multiple occurences, not circular", () => {
    const expected = s({ a: { a: null }, b: { a: null } });
    const obj = { a: null };
    const actual = stringifySafe({ a: obj, b: obj });
    assert.strictEqual(actual, expected);
});

await test("Mixed occurences", () => {
    const expected = s({ a: { a: "[CIRCULAR #1]" }, b: { a: "[CIRCULAR #1]" }, c: { a: null }, d: { a: null } });
    const objA = { a: null };
    objA.a = objA;
    const objB = { a: null };
    const actual = stringifySafe({ a: objA, b: objA, c: objB, d: objB });
    assert.strictEqual(actual, expected);
});

await test("Mixed occurences in array", () => {
    const expected = s([{ a: "[CIRCULAR #1]" }, { a: "[CIRCULAR #1]" }, { a: null }, { a: null }]);
    const objA = { a: null };
    objA.a = objA;
    const objB = { a: null };
    const actual = stringifySafe([objA, objA, objB, objB]);
    assert.strictEqual(actual, expected);
});

await test("Deeper circle", () => {
    const expected = s({ a: { a: { a: { a: "[CIRCULAR #1]" } } } });
    const objA = { a: null };
    const objB = { a: null };
    const objC = { a: null };
    const objD = { a: null };
    objA.a = objB;
    objB.a = objC;
    objC.a = objD;
    objD.a = objA;
    const actual = stringifySafe(objA);
    assert.strictEqual(actual, expected);
});

await test("Deeper circle in lower object", () => {
    const expected = s({ b: { arr: [{ a: { a: { a: { a: "[CIRCULAR #1]" } } } }, 14] } });
    const objA = { a: null };
    const objB = { a: null };
    const objC = { a: null };
    const objD = { a: null };
    objA.a = objB;
    objB.a = objC;
    objC.a = objD;
    objD.a = objA;
    const actual = stringifySafe({ b: { arr: [objA, 14] } });
    assert.strictEqual(actual, expected);
});

await test("Circular getter ref", () => {
    const expected = s({ b: 42, a: "[CIRCULAR #1]" });
    const obj = { b: 42, get a() { return obj; } };
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("Multiple overlapping circles", () => {
    const expected = s({ a: { b: { c: { d: "The greeks used olive oil to b_", a: "[CIRCULAR #1]" }, a: "[CIRCULAR #2]" } } });
    const obj = {
        a: {
            b: {
                c: {
                    d: "The greeks used olive oil to b_"
                }
            }
        }
    };
    obj.a.b.a = obj.a;
    obj.a.b.c.a = obj.a.b;
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("Circle in array", () => {
    const expected = s({ a: { a: ["[CIRCULAR #1]", "[CIRCULAR #1]"] } });
    const obj = { a: { a: null } };
    obj.a.a = [obj, obj];
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("Multiple nested Circles", () => {
    const expected = s({ a: { a: { a: "[CIRCULAR #1]" }, b: { a: "[CIRCULAR #1]" } } });
    const obj = { a: { a: { a: null }, b: { a: null } } };
    obj.a.a.a = obj;
    obj.a.b.a = obj;
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("Multiple Circles to root", () => {
    const expected = s({ a: { a: "[CIRCULAR #1]" }, b: { a: "[CIRCULAR #1]" } });
    const obj = { a: { a: null }, b: { a: null } };
    obj.a.a = obj;
    obj.b.a = obj;
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("Same circles at different points", () => {
    const expected = s({ a: { c: [{ d: "[CIRCULAR #1]" }] }, b: { c: [{ d: "[CIRCULAR #1]" }] } });
    const objA = { c: [{ d: null }] };
    objA.c[0].d = objA;
    const objB = { a: objA, b: objA };
    const actual = stringifySafe(objB);
    assert.strictEqual(actual, expected);
});

await test("Same circles at different nested points", () => {
    const expected = s({ a: { c: { d: [{ e: "[CIRCULAR #1]" }] } }, b: { c: { d: [{ e: "[CIRCULAR #1]" }] } } });
    const objA = { d: [{ e: null }] };
    objA.d[0].e = objA;
    const objB = { a: { c: objA }, b: { c: objA } };
    const actual = stringifySafe(objB);
    assert.strictEqual(actual, expected);
});

await test("Custom replacers", () => {
    const expected = s({ a: "14h", b: { c: { d: { circular: true, circleLength: "2h" } } } });
    const obj = { a: 14, b: { c: { d: null } } };
    obj.b.c.d = obj.b;
    const actual = stringifySafe(obj, (k, v) => typeof v === "number" ? `${v}h` : v, (stack) => ({ circular: true, circleLength: stack.length }));
    assert.strictEqual(actual, expected);
});

await test("Nested intertwined circles", () => {
    const expected = s({ a: [{ a: [["[CIRCULAR #1]"]] }, [{ a: ["[CIRCULAR #2]"] }]] })
    const obj = {
        a: [
            { a: [[null]] },
            null
        ]
    }
    obj.a[0].a[0][0] = obj.a[0];
    obj.a[1] = obj.a[0].a[0];
    const actual = stringifySafe(obj);
    assert.strictEqual(actual, expected);
});

await test("getSafeReplacer", () => {
    const replacer = getSafeReplacer();
    assert.strictEqual(replacer("a", "b"), "b");
})
