import { Application, IApplicationOptions, IApplicationPlugin } from '@pixi/app';

import { FieldOfView } from './field-of-view';

declare module '@pixi/app' {
    export interface Application {
        fov: FieldOfView;
    }
}

export const AppLoaderPlugin: IApplicationPlugin = {
    init(this: Application, _options: IApplicationOptions): void {
        this.fov = new FieldOfView(this);
    },
    destroy(this: Application): void {
        delete this.fov;
    },
};
