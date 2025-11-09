import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function myRandom(min: number, max: number, seed?: number) {
	const x = Math.sin(seed || Math.random()) * 10000;
	return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}
export function boxMullerTransform(): number {
	const u1 = Math.random();
	const u2 = Math.random();
	const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	return z;
}

// generate a data-uri from an SVG string
function toDataUri(svg: string) {
	return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// build a 5-point star SVG where the 5 outer nodes are slightly jittered
function makeStarDataUri(jitter = 0.12, color = '#ffffff') {
	const cx = 12;
	const cy = 12;
	const outerR = 10;
	const innerR = outerR * 0.45;
	const pts: string[] = [];

	for (let k = 0; k < 5; k++) {
		const aOuter = (Math.PI / 180) * (-90 + k * 72);
		const aInner = (Math.PI / 180) * (-90 + k * 72 + 36);

		// small pseudo-random offsets per point
		const ro = 1 + (Math.random() * 2 - 1) * jitter;
		const ri = 1 + (Math.random() * 2 - 1) * (jitter * 0.6);

		const ox = cx + Math.cos(aOuter) * outerR * ro;
		const oy = cy + Math.sin(aOuter) * outerR * ro;
		pts.push(`${ox.toFixed(3)},${oy.toFixed(3)}`);

		const ix = cx + Math.cos(aInner) * innerR * ri;
		const iy = cy + Math.sin(aInner) * innerR * ri;
		pts.push(`${ix.toFixed(3)},${iy.toFixed(3)}`);
	}

	const path = `M${pts.join('L')}Z`;
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='${color}' d='${path}'/></svg>`;
	return toDataUri(svg);
}

// precompute flakes once (keeps template simpler)
export const flakes = Array.from({ length: 400 }, (_, i) => {
	const size = Math.round(myRandom(1, 16)); // single size param (px)
	// jitter based on a small normal deviate (absolute) so jitter >= 0
	const jitter = Math.abs(boxMullerTransform()) * 0.22;
	const bg = makeStarDataUri(jitter);
	const left = myRandom(0, 100);
	const delay = (boxMullerTransform() * 4.5 + 11).toFixed(3);
	const rotate = myRandom(0, 360);
	return { i, size, bg, left, delay, rotate };
});
