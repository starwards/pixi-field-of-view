import { Application, IApplicationOptions, IApplicationPlugin } from '@pixi/app';
import { Group, Layer } from '@pixi/layers';

import { Container } from '@pixi/display';
import { ShadowFilter } from './filters/ShadowFilter';
import { augmentApplication } from './mixins/Application';
import { augmentContainer } from './mixins/Container';

export { filterFuncs } from './filters/FilterFuncs';
export { ShadowFilter } from './filters/ShadowFilter';
export { ShadowMaskFilter } from './filters/ShadowMaskFilter';
export { augmentApplication } from './mixins/Application';
export { augmentContainer } from './mixins/Container';
export { PointOfView } from './point-of-view';

export class Shadows {
    // The objects that will block vision
    casterGroup = new Group();
    casterLayer = new Layer(this.casterGroup);
    // The objects that will remain ontop of the shadows
    overlayGroup = new Group();
    overlayLayer = new Layer(this.overlayGroup);
    filter: ShadowFilter;
    container = new Container();
    diffuseLayer: Layer | undefined;
    normalLayer: Layer | undefined;
    lightLayer: Layer | undefined;
    constructor(app: Application) {
        // // Create the shadow filter
        this.filter = new ShadowFilter(app.renderer.width, app.renderer.height);
        // Set up the container mixin so that it tells the filter about the available shadows and objects
        augmentContainer(this.casterGroup, this.overlayGroup, this.filter);
        // Overwrite the application render method
        augmentApplication(app, this.filter);
        app.stage.addChild(this.container);
        // Set up the shadow layers
        app.stage.addChild(this.casterLayer, this.overlayLayer);

        this.container.filters = [this.filter];
    }
}
declare module '@pixi/app' {
    export interface Application {
        fov: Shadows;
    }
}

export const AppLoaderPlugin: IApplicationPlugin = {
    init(this: Application, options: IApplicationOptions): void {
        this.fov = new Shadows(this);
    },
    destroy(this: Application): void {
        delete this.fov;
    },
};
