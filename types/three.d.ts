// Fallback module declaration for three if type resolution hiccups in certain tooling setups.
// @types/three is installed; this ensures the compiler resolves it even if path mapping conflicts.
declare module 'three';
