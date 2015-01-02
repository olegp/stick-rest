# Stick REST

Install with `npm install stick-rest` (assuming you've already installed [Stick](https://github.com/olegp/stick) with `npm install stick` and [Common Node](https://github.com/olegp/common-node) with `npm install -g common-node`), then copy the following into `index.js`:

```js
var Application = require("stick").Application;

app.configure("stick-rest", "route");

app.get("/", function() {
  return {hello:"world"};
});
```

Then run with `common-node index.js` and test with `curl http://localhost:8080`.



