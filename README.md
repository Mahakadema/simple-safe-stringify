# simple safe stringify
A JSON stringifier that does not fail on circular structures or bigints

### Usage
1. Install the package `npm i simple-safe-stringify`
2. Import the module in your project
```js
import { stringifySafe } from "simple-safe-stringify";
```
3. Stringify any object
```js
const circularObject = {
    some: {
        levels: {
            deep: null
        }
    }
};
circularObject.some.levels.deep = circularObject.some;

const json = stringifySafe(circularObject);

console.log(json); // '{"some":{"levels":{"deep":"[CIRCULAR #1]"}}}'
```
