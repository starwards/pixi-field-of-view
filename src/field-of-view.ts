import { Group, Layer, Stage } from '@pixi/layers';

import { Application } from '@pixi/app';
import { Container } from '@pixi/display';
import { PointOfView } from './point-of-view';
import { ShadowFilter } from './filters/ShadowFilter';
import { preRenderHook } from './pre-render-hook';

export class FieldOfView {
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
        // Replace the stage with a layered stage
        app.stage = new Stage();
        // hook into application render
        preRenderHook(
            app,
            (renderer: Application['renderer']) => this.filter.update(renderer),
            this.addContainerToFilter
        );
        app.stage.addChild(this.container);
        // Set up the shadow layers
        app.stage.addChild(this.casterLayer, this.overlayLayer);

        this.container.filters = [this.filter];
    }

    // tell the filter about the available shadows and objects
    private addContainerToFilter = (c: Container) => {
        if (c.parentGroup === this.casterGroup) this.filter._shadowCasterContainer.children.push(c);
        if (c.parentGroup === this.overlayGroup) this.filter._shadowOverlayContainer.children.push(c);
        if (c instanceof PointOfView) this.filter._pointsOfViewContainer.children.push(c);
    };
}
