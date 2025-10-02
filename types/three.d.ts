// Relaxed fallback declarations to prevent missing member type errors when @types/three version
// lags behind the installed three runtime. We purposely type most classes as 'any' to unblock build.
// If full typing is desired later, remove this file and rely solely on @types/three.
declare module 'three' {
	export type Any = any;
	// Export a generic namespace-like object (CommonJS interop) with index signature.
	const THREE: any;
	export default THREE;
	// Provide minimal class/value stubs as 'any' so existing code compiles.
		export const WebGLRenderer: any;
		export const Scene: any;
		export const Camera: any;
		export const Clock: any;
		export const RawShaderMaterial: any;
		export const BufferGeometry: any;
		export const Mesh: any;
		export const LineSegments: any;
		export const WebGLRenderTarget: any;
		export const PlaneGeometry: any;
		export const Vector2: any;
		export const Vector3: any;
		export const Vector4: any;
		export const Color: any;
		export const DataTexture: any;
		export const RGBAFormat: any;
		export const LinearFilter: any;
		export const ClampToEdgeWrapping: any;
		export const AdditiveBlending: any;
		export const HalfFloatType: any;
		export const FloatType: any;
}
