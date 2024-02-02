# jsonkv-client
A simple client for [jsonkv-server](https://github.com/ilsubyeega/jsonkv-server). 
It was specifically created for use in some broadcasts.

## Usage
```bash
# currently not released.
$ pnpm i jsonkv-client
```
```js
import { JsonKvClient } from 'jsonkv-client';

const client = new JsonKvClient('baseUrl', 'secret');

const getOp = await client.get('key');
const postOp = await client.post('key', 'value');
const putOp = await client.put('key', 'value');
// uses rfc6902, JSON patch.
// https://tools.ietf.org/html/rfc6902
const patchOp = await client.patch('key', [
  {op: 'replace', path: '/0/age', value: 21},
  {op: 'add', path: '/-', value: {first: 'Raphael', age: 37}},
]);

const keyListener = await client.listen('key', (value) => {
  console.log('key value:', value);
}, {
    mode: 'full',
    reconnectInterval: 1000,
});
keyListener.close();
```

## TODO
- [ ] Add tests
- [ ] Add UI dashboard

## License
Apache-2.0