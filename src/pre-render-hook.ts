import '@pixi/ticker';

import { Application } from '@pixi/app';
import { Container } from '@pixi/display';

/**
 * hook into the application render ticker, run logic before render
 * @param application the application to hook
 * @param perApp logic to run once oper render for the entire application
 * @param perContainer logic to run once per render per container
 */
export function preRenderHook(
    application: Application,
    perApp: (renderer: Application['renderer']) => void,
    perContainer: (c: Container) => void
) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const orTransform: Container['updateTransform'] = Container.prototype.updateTransform;
    const currentRenderTriggered = new Set<Container>();

    // hook on updateTransform for our pre-render hook
    Container.prototype.updateTransform = function updateTransform(this: Container, ...args) {
        // ensure only once per render
        if (!currentRenderTriggered.has(this)) {
            currentRenderTriggered.add(this);
            perContainer(this);
        }

        return orTransform.apply(this, args) as ReturnType<Container['updateTransform']>;
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    application.ticker.remove(application.render, application);
    application.render = function render(this: Application) {
        // Update stage transforms
        const cacheParent = this.stage.parent;

        this.stage.parent = this.stage;
        this.stage.updateTransform(); // will trigger updateTransform on all containers
        currentRenderTriggered.clear();

        perApp(this.renderer);
        this.stage.parent = cacheParent;

        // Render the stage without updating the transforms again
        this.renderer.render(this.stage, { skipUpdateTransform: true });
    };

    // Reassign ticker because its setter initialises the render method
    // eslint-disable-next-line no-self-assign
    application.ticker = application.ticker;
}
