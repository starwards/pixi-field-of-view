## Archived - reference only
This repository was meant to be used to calculate field of view using GPU shaders for the starwards game, but we decided to forego this design approach and implement it in the game core logic instead. 
As it was refered in some external correspondence, This repository is left archived as-is.

# pixi-field-of-view

[![npm version](https://badge.fury.io/js/pixi-field-of-view.svg)](https://badge.fury.io/js/pixi-field-of-view)

pixi-field-of-view allows you to add shadows and lights to your pixi stage.
The lights themselves are very simple, and this plugin purely focuses on the shadows.

This repository is a fork of [pixi-shadows](https://github.com/TarVK/pixi-shadows). Most of the hard work was done by TarVK.
### How to use
documentation pending
## Installation

```
npm install pixi-field-of-view
```

or, clone and build this repository, then copy the pixi-field-of-view [commonjs script](./dist/pixi-field-of-view.js) or [umd script](./dist/pixi-field-of-view.umd.js) manually for usage without npm.

## Vanilla JS, UMD build

All pixiJS v6 plugins has special `umd` build suited for vanilla.
Navigate `pixi-field-of-view` npm package, take `dist/pixi-field-of-view.umd.js` file. 
Also, you can access CDN link, something like `https://cdn.jsdelivr.net/npm/pixi-field-of-view@latest/dist/pixi-field-of-view.umd.js`.

```html
<script src='lib/pixi.js'></script>
<script src='lib/pixi-field-of-view.umd.js'></script>
```
All classes can then be accessed through `PIXI.fov` package.
