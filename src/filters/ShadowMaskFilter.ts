import { Filter, FilterSystem, RenderTexture } from '@pixi/core';

import { CLEAR_MODES } from '@pixi/constants';
import { Matrix } from '@pixi/math';
import { PointOfView } from '../point-of-view';
import { filterFuncs } from './FilterFuncs';

export class ShadowMaskFilter extends Filter {
    private inverted = false;

    autoFit = false;
    padding = 0;
    overlayMatrix = new Matrix();

    constructor(private pointOfView: PointOfView) {
        super(
            /* glsl*/ `
            attribute vec2 aVertexPosition;
            attribute vec2 aTextureCoord;
            
            uniform mat3 projectionMatrix;
            uniform mat3 overlayMatrix;
            uniform mat3 filterMatrix;
            
            varying vec2 vTextureCoord;
            varying vec2 vOverlayCoord;
            varying vec2 vFilterCoord;
            
            void main(void){
                gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
                vTextureCoord = aTextureCoord;
                vOverlayCoord = (overlayMatrix * vec3(aTextureCoord, 1.0) ).xy;
            }
        `,
            /* glsl*/ `
            varying vec2 vOverlayCoord;
            varying vec2 vTextureCoord;
            uniform vec4 filterArea;
            
            uniform sampler2D shadowOverlaySampler;

            uniform vec2 dimensions;

            uniform sampler2D shadowSampler;

            uniform bool darkenOverlay;
            uniform bool inverted;

            uniform float overlayLightLength;

            uniform float lightPointCount;
            uniform float lightRange;
            uniform float lightScatterRange;
            uniform float lightIntensity;

            ${filterFuncs}
            
            void main(void){
                float pi = 3.141592653589793238462643;
                
                // The current coordinate on the texture measured in pixels
                vec2 pixelCoord = vTextureCoord * filterArea.xy;

                // The distance delta relative to the center
                vec2 lightDelta = pixelCoord - dimensions / 2.0;
                float distance = sqrt(lightDelta.x * lightDelta.x + lightDelta.y * lightDelta.y);
                if (distance > lightRange) return;

                // The final intensity of the light at this pixel
                float totalIntensity = 0.0;

                // The intensity of the pixel in the overlay map at this pixel
                vec4 overlayPixel = texture2D(shadowOverlaySampler, vOverlayCoord);

                // Go through all light points (at most 1000) to add them to the intensity
                for(float lightIndex=0.0; lightIndex<1000.0; lightIndex++){
                    if (lightIndex >= lightPointCount) break; // Stop the loop if we went over the pointCount

                    // Calculate the offset of this lightPoint, relative the the center of the light
                    float lightIndexFrac = (lightIndex + 0.5) / lightPointCount;
                    float offsetAngle = 2.0 * pi * lightIndexFrac;
                    vec2 offset = vec2(cos(offsetAngle), sin(offsetAngle)) * lightScatterRange;

                    // Calculate the location of this pixel relative to the lightPoint, and check the depth map
                    vec2 pointDelta = lightDelta - offset;
                    float pointDistance = sqrt(pointDelta.x * pointDelta.x + pointDelta.y * pointDelta.y);
                    float angle = mod(atan(pointDelta.y, pointDelta.x) + 2.0 * pi, 2.0 * pi);
                    vec4 depthPixel = texture2D(shadowSampler, vec2(angle / (2.0 * pi), lightIndexFrac));

                    // Extract the object distance from the depth map pixel
                    float objectDistance = colorToFloat(depthPixel) / 100000.0 * lightRange;
                    
                    // Calculate the intensity of this pixel based on the overlaySampler and objectDistance
                    float intensity = 0.0;
                    if(darkenOverlay){
                        if(objectDistance > pointDistance || objectDistance >= lightRange){
                            intensity = 1.0 - distance / lightRange;
                        }else if(overlayPixel.a > 0.5){
                            intensity = 1.0 - distance / lightRange;
                            intensity *= pow(1.0 - (distance - objectDistance) / (lightRange - objectDistance), 2.5) * overlayPixel.a;
                        }
                    }else{
                        if(inverted){
                            if(overlayPixel.a > 0.5){
                                intensity = 1.0-overlayPixel.a;
                            }else if (objectDistance > pointDistance || objectDistance >= lightRange) {
                                intensity = 0.0;
                            }else{
                                intensity = 1.0;
                            }
                        }else{
                            if (objectDistance > pointDistance || objectDistance >= lightRange) {
                                intensity = 1.0 - distance / lightRange;
                            }else if (overlayPixel.a > 0.5) {
                                intensity = (1.0 - distance / lightRange) * (1.0 - (pointDistance - objectDistance) / overlayLightLength);
                            }
                        }
                    }
                    

                    // Add the intensity to the total intensity
                    totalIntensity += intensity / lightPointCount;
                }

                // Create a mask based on the intensity
                gl_FragColor = vec4(vec3(lightIntensity * totalIntensity), 1.0);
            }
        `
        );

        this.uniforms.shadowSampler = pointOfView._shadowMapResultTexture;
        this.uniforms.lightPointCount = pointOfView.pointCount;
    }

    apply(filterManager: FilterSystem, input: RenderTexture, output: RenderTexture, clearMode?: CLEAR_MODES) {
        // Decide whether or not to darken the overlays
        this.uniforms.darkenOverlay = this.pointOfView.darkenOverlay;

        // Attach the object sampler
        const sc = this.pointOfView._shadowOverlaySprite;

        this.uniforms.shadowOverlaySpriteDimensions = [sc.width, sc.height];
        this.uniforms.shadowOverlaySampler = sc._texture;

        // Use the world transform (data about the absolute location on the screen) to determine the lights relation to the objectSampler
        const wt = this.pointOfView.worldTransform;
        const scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
        const range = this.pointOfView.range * scale;

        this.uniforms.lightRange = range;
        this.uniforms.lightScatterRange = this.pointOfView.scatterRange;
        this.uniforms.lightIntensity = this.pointOfView.intensity;

        // The length of the area of the overlay to be lit
        this.uniforms.overlayLightLength = this.pointOfView.overlayLightLength;

        // Invert the filter if specified
        this.uniforms.inverted = this.inverted;

        // Texture size increase in order to fit the sprite rectangle (even though we are only interested in a circle)
        // So we have to consider this in the texture size
        const texSize = 2 * this.pointOfView.range * (wt.a + wt.b);

        this.uniforms.dimensions = [texSize, texSize];

        // Calculate the object sampler position in relation to the light
        this.uniforms.overlayMatrix = filterManager.calculateSpriteMatrix(this.overlayMatrix, sc);

        // Apply the filter
        filterManager.applyFilter(this, input, output, clearMode);
    }
}
