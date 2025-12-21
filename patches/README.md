The files in this directory are used to patch the dependencies of the project.

They are applied using the [`patch-package`](https://www.npmjs.com/package/patch-package) command.

To create a patch, modify the files inside `node_modules` and run:

```
npx patch-package <package-name>
```

The patches are applied automatically when running `npm install`.

---
