import { CLEAR_MODES, SCALE_MODES } from '@pixi/constants';
import { Filter, FilterSystem, RenderTexture } from '@pixi/core';

import { Application } from '@pixi/app';
import { Container } from '@pixi/display';
import { Matrix } from '@pixi/math';
import { PointOfView } from '../point-of-view';
import { Sprite } from '@pixi/sprite';

export class ShadowFilter extends Filter {
    private _useShadowCastersAsOverlay = true;
    _shadowOverlayResultTexture: RenderTexture | undefined;
    _shadowOverlayResultSprite: Sprite | undefined;
    _shadowOverlayContainer: Container | undefined;
    _shadowCasterResultTexture: RenderTexture | undefined;
    _shadowCasterResultSprite: Sprite | undefined;
    _shadowCasterContainer: Container | undefined;
    _maskResultTexture: RenderTexture | undefined;
    _maskResultSprite: Sprite | undefined;
    _pointsOfViewContainer: Container | undefined;
    _maskMatrix: Matrix | undefined;
    constructor(private _width: number, private _height: number) {
        super(
            /* glsl*/ `
            attribute vec2 aVertexPosition;
            attribute vec2 aTextureCoord;
            
            uniform mat3 projectionMatrix;
            uniform mat3 otherMatrix;
            
            varying vec2 vMaskCoord;
            varying vec2 vTextureCoord;
            
            void main(void)
            {
                gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            
                vTextureCoord = aTextureCoord;
                vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;
            }
        `,
            /* glsl*/ `                    
            varying vec2 vMaskCoord;
            varying vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            uniform sampler2D mask;
            uniform vec4 maskClamp;
            uniform float ambientLight;
            
            void main(void){            
                vec4 original = texture2D(uSampler, vTextureCoord);
                vec4 masky = texture2D(mask, vMaskCoord);
            
                original *= ambientLight + (1.0 - ambientLight) * (masky.r + masky.g + masky.b) / 3.0;
            
                gl_FragColor = original;
            }
        `
        );

        this.uniforms.ambientLight = 0.0;
        this.uniforms.size = [this._width, this._height];

        this.__createCasterSources();
        this.__createOverlaySources();
        this.__createMaskSources();
    }
    // PointOfView overlay objects
    __createOverlaySources() {
        this._shadowOverlayResultTexture?.destroy();
        this._shadowOverlayResultSprite?.destroy();

        this._shadowOverlayContainer ||= new Container();

        // Create the final mask to apply to the container that this filter is applied to
        this._shadowOverlayResultTexture = RenderTexture.create({ width: this._width, height: this._height });
        this._shadowOverlayResultTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._shadowOverlayResultSprite = new Sprite(this._shadowOverlayResultTexture);
    }
    // PointOfView caster objects
    __createCasterSources() {
        this._shadowCasterResultTexture?.destroy();
        this._shadowCasterResultSprite?.destroy();

        this._shadowCasterContainer ||= new Container();

        // Create the final mask to apply to the container that this filter is applied to
        this._shadowCasterResultTexture = RenderTexture.create({ width: this._width, height: this._height });
        this._shadowCasterResultTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._shadowCasterResultSprite = new Sprite(this._shadowCasterResultTexture);
    }
    // Final mask to apply as a filter
    __createMaskSources() {
        this._maskResultTexture?.destroy();
        this._maskResultSprite?.destroy();

        // Create maskMatrix for shader transform data
        this._maskMatrix ||= new Matrix();

        // Create the final mask to apply to the container that this filter is applied to
        this._maskResultTexture = RenderTexture.create({ width: this._width, height: this._height });
        this._maskResultTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._pointsOfViewContainer ||= new Container();
        this._maskResultSprite = new Sprite(this._maskResultTexture);
    }
    // Update the mask texture (called from the Application mixin)
    update(renderer: Application['renderer']) {
        // Shadows and objects will automatically be added to containers because of the pre-render hook

        /* render shadow casters */
        // Remove the parent layer from the objects in order to properly render it to the container
        this._shadowCasterContainer.children.forEach((child) => {
            child._activeParentLayer = null;
        });

        // Render all the objects onto 1 texture
        renderer.render(this._shadowCasterContainer, {
            renderTexture: this._shadowCasterResultTexture,
            clear: true,
            skipUpdateTransform: true,
        });

        // Remove all the objects from the container
        this._shadowCasterContainer.children.length = 0;

        /* render shadow overlays */
        if (!this._useShadowCastersAsOverlay) {
            this._shadowOverlayContainer.children.forEach((child) => {
                child._activeParentLayer = null;
            });

            // Render all the objects onto 1 texture
            renderer.render(this._shadowOverlayContainer, {
                renderTexture: this._shadowOverlayResultTexture,
                clear: true,
                skipUpdateTransform: true,
            });

            // Remove all the objects from the container
            this._shadowOverlayContainer.children.length = 0;
        }

        /* render shadows */

        // Update all shadows and indicate that they may properly be rendered now
        const overlay = this._useShadowCastersAsOverlay
            ? this._shadowCasterResultSprite
            : this._shadowOverlayResultSprite;

        this._pointsOfViewContainer.children.forEach((pointOfView) => {
            if (pointOfView instanceof PointOfView) {
                pointOfView.renderStep = true;
                pointOfView.update(renderer, this._shadowCasterResultSprite, overlay);
            }
        });

        // Render all the final shadow masks onto 1 texture
        renderer.render(this._pointsOfViewContainer, {
            renderTexture: this._maskResultTexture,
            clear: true,
            skipUpdateTransform: true,
        });

        // Indicate that the shadows may no longer render
        this._pointsOfViewContainer.children.forEach((pointOfView) => {
            if (pointOfView instanceof PointOfView) {
                delete pointOfView.renderStep;
            }
        });

        // Remove all the shadows from the container
        this._pointsOfViewContainer.children.length = 0;
    }

    //  Apply the filter to a container
    apply(filterManager: FilterSystem, input: RenderTexture, output: RenderTexture, clearMode?: CLEAR_MODES) {
        // Filter almost directly taken from the pixi mask filter
        const maskSprite = this._maskResultSprite;
        const tex = this._maskResultSprite.texture;

        if (!tex.valid) {
            return;
        }

        // TODO: uvMatrix ?
        // if (!tex.transform) {
        //   tex.transform = new TextureMatrix(tex, 0.0);
        // }

        this.uniforms.mask = tex;
        this.uniforms.otherMatrix = filterManager.calculateSpriteMatrix(this._maskMatrix, maskSprite);

        filterManager.applyFilter(this, input, output, clearMode);
    }

    // Attribute getters + setters
    /**
     * @type {number} The brightness that unlit areas of the world should have
     */
    set ambientLight(frac: number) {
        this.uniforms.ambientLight = frac;
    }
    get ambientLight() {
        return this.uniforms.ambientLight as number;
    }
    /**
     * @type {number} The width of your application
     */
    set width(width) {
        this._width = width;

        this.uniforms.size = [this._width, this._height];
        this.__createOverlaySources();
        this.__createCasterSources();
        this.__createMaskSources();
    }
    get width() {
        return this._width;
    }
    /**
     * @type {number} The height of your application
     */
    set height(height) {
        this._height = height;

        this.uniforms.size = [this._width, this._height];
        this.__createOverlaySources();
        this.__createCasterSources();
        this.__createMaskSources();
    }
    get height() {
        return this._height;
    }
    /**
     * @type {boolean} Whether or not to use shadow casters as shadow overlays as well
     */
    set useShadowCasterAsOverlay(val) {
        this._useShadowCastersAsOverlay = val;
    }

    get useShadowCasterAsOverlay() {
        return this._useShadowCastersAsOverlay;
    }
}
