import { webcrypto as crypto } from 'node:crypto';
import { env } from '$env/dynamic/private';

function makeShuffle(lst: string[]): string[] {
	const shuffle = lst.slice();
	while (!isShuffle(lst, shuffle)) {
		shuffle.sort(() => Math.random() - 0.5);
	}
	return shuffle;
}

function isShuffle(lst: string[], shuffle: string[]): boolean {
	const noSelfLoops = myZip(lst, shuffle).every(
		([wichtel, wichtelchind]) => wichtel !== wichtelchind
	);
	// potentially check for other conditions such as no repeated wichteli from last year if it is stateful comp.
	return noSelfLoops;
}

function myZip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
	return arr1.map((value, index) => [value, arr2[index]]);
}

function normalizeCipher(s: string) {
	try {
		s = decodeURIComponent(s);
	} catch {
		/* ignore malformed % sequences */
	}
	s = s.replace(/ /g, '+');
	if (s.includes('-') || s.includes('_')) {
		s = s.replace(/-/g, '+').replace(/_/g, '/');
		while (s.length % 4) s += '=';
	}
	return s;
}

// Helper to convert Uint8Array to Base64 string (platform-agnostic)
function uint8ArrayToBase64(bytes: Uint8Array): string {
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(bytes).toString('base64');
	}
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

// Helper to convert Base64 string to Uint8Array (platform-agnostic)
function base64ToUint8Array(b64: string): Uint8Array {
	if (typeof Buffer !== 'undefined') {
		const buf = Buffer.from(b64, 'base64');
		return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
	}
	const binary = atob(b64);
	const arr = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		arr[i] = binary.charCodeAt(i);
	}
	return arr;
}

async function keyFromPassphrase(pass: string) {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(pass));
	return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
		'encrypt',
		'decrypt'
	]);
}

async function encryptGCM(payload: string, pass: string): Promise<string> {
	const key = await keyFromPassphrase(pass);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoded = new TextEncoder().encode(payload);
	const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
	const combined = new Uint8Array(iv.length + ct.length);
	combined.set(iv);
	combined.set(ct, iv.length);
	return uint8ArrayToBase64(combined);
}

async function decryptGCM(tokenB64: string, pass: string): Promise<string | null> {
	try {
		const data = base64ToUint8Array(tokenB64);
		if (data.length < 12) return null;
		const iv = data.subarray(0, 12);
		const ct = data.subarray(12);
		const key = await keyFromPassphrase(pass);
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: iv as any },
			key,
			ct as any
		);
		return new TextDecoder().decode(decrypted);
	} catch {
		return null;
	}
}

async function checkWichtelCipher(
	wichtel: string,
	cipher: string,
	pwd: string
): Promise<string | false> {
	const decoded = normalizeCipher(cipher.trim());
	const plain = await decryptGCM(decoded, pwd);
	if (!plain) return false;
	try {
		const parsed = JSON.parse(plain) as { W: string; C: string };
		return parsed.W === wichtel.trim() ? parsed.C : false;
	} catch {
		return false;
	}
}

async function createWichtelCipher(wichtel: string, child: string, pwd: string): Promise<string> {
	return encodeURIComponent(await encryptGCM(JSON.stringify({ W: wichtel, C: child }), pwd));
}

async function computeSantas(
	all_participants: string[],
	pwd: string
): Promise<{ W: string; CIPHER: string }[]> {
	const unique_participants = Array.from(new Set(all_participants)).map((x) => x.trim());
	const shuffle = makeShuffle(unique_participants);
	const result = myZip(unique_participants, shuffle).map(async ([wichtel, wichtelchind]) => ({
		W: wichtel,
		CIPHER: await createWichtelCipher(wichtel, wichtelchind, pwd)
	}));
	const resolved = await Promise.all(result);
	return resolved;
}

export function load({ url }) {
	// read on server or at render-time
	return {
		qname: url.searchParams.get('name') ?? '',
		qpwd: url.searchParams.get('password') ?? ''
	};
}

export const actions = {
	wichtelkind: async ({ request }) => {
		const formData = await request.formData();
		const wichtel = formData.get('name') as string;
		const cipher = formData.get('password') as string;
		const pwd = env.WICHTEL_PASSWORD as string;
		const wichtelkind = await checkWichtelCipher(wichtel, cipher, pwd);
		return { wichtelkind };
	},

	adminComputeSantas: async ({ request }) => {
		const formData = await request.formData();
		const adminPwd = formData.get('adminPwd') as string;
		const participants = JSON.parse(formData.get('participants') as string) as string[];

		if (adminPwd !== env.WICHTEL_PASSWORD) {
			return { error: 'Invalid admin password' };
		}

		const matching = await computeSantas(participants, env.WICHTEL_PASSWORD);
		return { matching };
	}
};
