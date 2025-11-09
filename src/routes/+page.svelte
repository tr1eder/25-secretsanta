<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { deserialize } from '$app/forms';
	import { flakes } from '$lib/utils';

	const GIFT_RED = '#a11e2c';
	const DARK_RED = '#830f10';
	const RIBBON = '#e48f4f';
	const DOT = '#FFFFFF';

	const { data } = $props() as { data?: { qname?: string; qpwd?: string } };

	// User state
	let name = $state(data?.qname ?? '');
	let password = $state(data?.qpwd ?? '');
	let showPassword = $state(false);

	// Result state
	let answer = $state('');
	let lidGroup: SVGGElement | null = null;
	let animLidPos = $state({ x: 0, y: 0, rot: 0 });
	const LID_PIVOT = { cx: 110, cy: 72 };

	// Admin state
	let showAdmin = $state(false);
	let adminPwd = $state('');
	let admAddParticipant = $state('');
	let participants: string[] = $state([]);
	let hoveredIndex = $state(-1);
	let adminNewMatching = $state<{ W: string; CIPHER: string }[]>([]);

	function toggleAdmin() {
		showAdmin = !showAdmin;
	}

	function translateLid(x: number, y: number) {
		return `${x + animLidPos.x} ${y + animLidPos.y}`;
	}

	function sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

	async function animateLid() {
		// wiggle left/right then lift
		const seq = [
			{ x: 1, y: 0, rot: 0 },
			{ x: -0.3, y: 0, rot: 0 },
			{ x: 0.5, y: 0, rot: 0 },
			{ x: -0.5, y: 0, rot: 0 },
			{ x: 1, y: 0, rot: 1 },
			{ x: -2, y: 0, rot: -5 },
			{ x: 1, y: -3, rot: 4 },
			{ x: -2, y: 0, rot: 0 },
			{ x: 1, y: 0, rot: 1 },
			{ x: -1, y: 0, rot: 0 },
			{ x: 1, y: 0, rot: 1 },
			{ x: -4, y: 0, rot: -1 },
			{ x: 5, y: 0, rot: -2 },
			{ x: -6, y: 0, rot: 2 },
			{ x: 8, y: 0, rot: -4 },
			{ x: -5, y: 0, rot: 0 },
			{ x: 4, y: 0, rot: 6 },
			{ x: -7, y: 0, rot: -3 },
			{ x: 14, y: -1, rot: 3 },
			{ x: -11, y: 0, rot: -4 },
			{ x: 10, y: -10, rot: 3 },
			{ x: 7, y: -15, rot: -8 },
			{ x: -5, y: -20, rot: 7 },
			{ x: 20, y: -40, rot: 9 } // final open
		];
		for (const step of seq) {
			animLidPos = step;
			await sleep(100);
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (name === '' || password === '') {
			alert('Please fill out both fields');
			return;
		}

		// call the server-side action
		const formData = new FormData();
		formData.append('name', name);
		formData.append('password', password);
		const response = await fetch(`?/wichtelkind`, {
			method: 'POST',
			body: formData
		});
		const data = deserialize(await response.text());

		if (data.type === 'success') {
			if (data.data?.error) {
				alert(data.data.error.toString());
				return;
			}
			const wichtelkind = data.data?.wichtelkind as string | false;
			if (!wichtelkind) {
				alert('Incorrect name or password');
				return;
			}
			// answer = `You're the Secret Santa of ${wichtelkind}.`;
			answer = wichtelkind;
			await animateLid();
		} else if (data.type === 'failure') {
			alert(data.data?.message?.toString() || 'Unknown error');
		} else {
			alert('Unknown error');
		}
	}

	async function handleAdminSubmit(event: Event) {
		event.preventDefault();
		const formData = new FormData();
		formData.append('adminPwd', adminPwd);
		formData.append('participants', JSON.stringify(participants));
		fetch('?/adminComputeSantas', {
			method: 'POST',
			body: formData
		})
			.then((response) => response.text())
			.then((serialized) => {
				const data = deserialize(serialized);
				if (data.type === 'success') {
					if (data.data?.error) {
						alert(data.data.error.toString());
						return;
					}
					const matching = data.data?.matching as { W: string; CIPHER: string }[];
					adminNewMatching = matching;
				} else if (data.type === 'failure') {
					alert(data.data?.message?.toString() || 'Unknown error');
				} else {
					alert('Unknown error');
				}
			});
	}

	function handleAddParticipant(event: Event) {
		event.preventDefault();
		if (admAddParticipant === '') return;
		participants = [...participants, admAddParticipant];
		admAddParticipant = '';
	}

	function getMatchURL(match: { W: string; CIPHER: string }): string {
		const baseUrl = window.location.origin + window.location.pathname;
		const url = new URL(baseUrl);
		url.searchParams.append('name', match.W);
		url.searchParams.append('password', match.CIPHER);
		return url.toString();
	}
</script>

<div>
	<span
		style="display:flex; flex-direction:row; align-items:center; justify-content:center; gap:0.5rem; text-align:center; margin:1.5rem 0; width:100%;"
		class="my-6 text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl"
	>
		<h1 style="margin:0">Secret Santa 2025</h1>
		<button onclick={toggleAdmin} class="text-xl sm:text-2xl md:text-3xl lg:text-4xl">🎅🎄</button>
	</span>
	<div class="two-col">
		<div class="left">
			<div class="tree-wrap" style="position:relative; display:inline-block;">
				<img src="/tree.jpg" alt="Tree" style="display:block;" />
				<!-- overlay exactly covering the image so snow starts at the tree top and spans its width -->
				<div
					class="snow-overlay"
					aria-hidden="true"
					style="position:absolute; inset:0; pointer-events:none; overflow:visible;"
				>
					{#each flakes as f (f.i)}
						<div
							class="snowflake"
							style="
								position: absolute;
								top: 0px;
								left: {f.left}%;
								width: {f.size}px;
								height: {f.size}px;
								animation-duration: {f.speed}s, {f.spin}s;
								animation-delay: {f.delay}s, 0s;
								animation-timing-function: linear, linear;
								animation-iteration-count: 1, infinite;
								animation-fill-mode: both, none;
								background-image: {f.bg};
								background-size: 100% 100%;
								background-repeat: no-repeat;
								background-position: center;
								--initial-rot: {f.rotate ?? 0}deg;
								transform-origin: center;
							"
						></div>
					{/each}
				</div>
			</div>
		</div>
		<div class="right">
			<p>Wir wichteln wieder &mdash; und so geht's:</p>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="flex space-x-2">
					<Input
						id="name"
						type="text"
						bind:value={name}
						placeholder="Name"
						class="mt-1 block w-1/2 border-0 bg-orange-100"
					/>

					<div class="relative mt-1 w-1/2">
						<Input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="Password"
							class="block w-full border-0 bg-orange-100 pr-10"
						/>
						<button
							type="button"
							class="absolute right-2 top-1/2 -translate-y-1/2 p-1"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							onclick={() => (showPassword = !showPassword)}
						>
							{#if showPassword}
								<!-- eye-off icon -->
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.5-10-8 1-2.5 3-4.6 5.5-6M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />
								</svg>
							{:else}
								<!-- eye icon -->
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							{/if}
						</button>
					</div>
					<Button
						id="submit"
						type="submit"
						class="mt-1 {name !== '' && password !== ''
							? 'block'
							: 'hidden'} w-1/5 cursor-pointer bg-red-900">Submit</Button
					>
				</div>
			</form>

			<p class="mt-3">
				1. Login: Benutzername und Passwort oben eintragen, falls noch nicht geschehen. Submit →
				Wichtelkind erfahren.
			</p>
			<p class="mt-1">
				2. Regeln: 1 Geschenk, unter 50 CHF, eingepackt und angeschrieben, so, dass der Absender
				unerkannt bleibt.
			</p>
			<p class="mt-1">3. Finale: Wir raten gemeinsam am Heilig Abend 24.12.</p>

			<!-- Old Answer (rendered plainly in a rounded div) -->
			<!-- <div
				id="answer"
				class="mt-4 {answer === '' ? 'hidden' : 'block'} w-full rounded-md bg-orange-100 px-3 py-2"
			>
				{answer}
			</div> -->

			<div class="gift-vector mt-6 w-full justify-center {answer === '' ? 'hidden' : 'flex'}">
				<svg viewBox="0 0 220 200" width="220" height="200" aria-label="Present">
					<!-- place this inside the main <svg> BEFORE the box body path so it renders behind the box -->
					<text x="110" y="75" text-anchor="middle" font-weight="bold" pointer-events="none">
						{answer}
					</text>
					<defs>
						<pattern id="polka" width="20" height="20" patternUnits="userSpaceOnUse">
							<rect width="20" height="20" fill={GIFT_RED} />
							{#if flakes && flakes.length}
								<!-- use the first flake's bg (strip possible url(...) wrapper) -->
								<image
									x="0"
									y="0"
									width="12"
									height="12"
									href={flakes[0].bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')}
									preserveAspectRatio="xMidYMid slice"
								/>
							{:else}
								<circle cx="10" cy="10" r="3" fill={DOT} />
							{/if}
						</pattern>
					</defs>

					<!-- Lid + bow grouped so we animate transform -->
					<g
						bind:this={lidGroup}
						transform="translate({animLidPos.x} {animLidPos.y}) rotate({animLidPos.rot} {LID_PIVOT.cx} {LID_PIVOT.cy})"
						class="lid"
					>
						<path d="M42 60 L178 60 L178 84 L42 84 Z" fill={GIFT_RED} />
						<rect x="96" y="58" width="28" height="26" fill={RIBBON} />
						<path
							fill={RIBBON}
							d="M116 58
               C 98 40, 68 42, 56 60
               C 46 75, 62 88, 80 82
               C 92 78, 104 70, 116 58 Z"
						/>
						<path
							fill={RIBBON}
							d="M104 58
               C 122 40, 152 42, 164 60
               C 174 75, 158 88, 140 82
               C 128 78, 116 70, 104 58 Z"
						/>
					</g>

					<!-- Box body -->
					<path d="M50 84 H170 L180 200 H40 Z" fill="url(#polka)" />
					<g class="lidshadow">
						<path
							d="M49.5 84 L170.5 84 L170.5 {Math.max(
								84,
								Number(translateLid(170.5, 91).split(' ')[1])
							)} L49.5 {Math.max(84, Number(translateLid(49.5, 91).split(' ')[1]))} Z"
							fill={DARK_RED}
						/>
					</g>
					<rect x="96" y="84" width="28" height="116" fill={RIBBON} />
				</svg>
			</div>

			<div id="admin" class={showAdmin ? 'block' : 'hidden'}>
				<p class="mb-2 mt-6 font-bold">Admin Console</p>

				<form onsubmit={handleAdminSubmit} class="gap-x-0.5 gap-y-2">
					<div class="flex flex-wrap">
						<Input
							id="admAddParticipant"
							type="text"
							bind:value={admAddParticipant}
							onkeypress={(e) => e.key === 'Enter' && handleAddParticipant(e)}
							placeholder="Add Participant"
							class="w-30 mr-2 mt-1 border-0 bg-emerald-50"
						/>
						{#each participants as participant, i}
							<Button
								id="participant-{participant}"
								type="button"
								class="m-0.5 mt-1 block cursor-pointer border-0 bg-emerald-800 px-3"
								onclick={() => participants.splice(i, 1)}
								onmouseenter={(e) => (hoveredIndex = i)}
								onmouseleave={(e) => (hoveredIndex = -1)}
							>
								{hoveredIndex === i ? 'Remove' : participants[i]}
							</Button>
						{/each}
					</div>
					<div class="flex">
						<Input
							id="adminPwd"
							type="password"
							bind:value={adminPwd}
							placeholder="Admin Password"
							class="w-3/10 mt-1 border-0 bg-orange-100"
						/>
						<Button
							id="admin-submit"
							type="submit"
							disabled={adminPwd === '' || Array.from(new Set(participants)).length < 2}
							class="w-7/10 ml-2 mt-1 cursor-pointer border-0 bg-red-900"
						>
							Compute Secret Santas
						</Button>
					</div>
				</form>

				{#each adminNewMatching as match}
					<div
						class="mt-2 w-full rounded-md bg-orange-100 px-3 py-2"
						style="overflow-wrap: anywhere; word-break: break-word; white-space: normal;"
					>
						<p>Wichtel: {match.W}</p>
						<p>Passwort: {match.CIPHER}</p>
						<Button class="mt-1 " onclick={() => navigator.clipboard.writeText(getMatchURL(match))}>
							Copy URL
						</Button>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		background-color: #fffaf4;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

	.two-col {
		display: grid;
		gap: 1rem;
		min-height: 320px;
		grid-template-columns: 1fr 1fr;
		grid-template-areas: 'left right';
		align-items: start;
	}

	.left {
		grid-area: left;
		position: relative;
		margin: 1rem;
	}
	.right {
		grid-area: right;
		margin: 1rem;
	}

	.left img {
		position: static;
		display: block;
		/* left: 10px;
		top: 10px; */
		max-width: 100%;
		height: auto;
		z-index: 1;
	}

	.tree-wrap {
		position: relative;
		display: inline-block;
	}
	.snow-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 2;
		overflow: visible;
	}

	/* On narrow screens: single column, right above left */
	@media (max-width: 800px) {
		.two-col {
			grid-template-columns: 1fr;
			grid-template-areas:
				'right'
				'left';
			min-height: auto;
		}
	}

	@keyframes snow {
		0% {
			top: -10px;
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			top: 100%;
			opacity: 0;
		}
	}
	@keyframes spin {
		from {
			transform: rotate(var(--initial-rot, 0deg));
		}
		to {
			transform: rotate(calc(var(--initial-rot, 0deg) + 360deg));
		}
	}
	.snowflake {
		/* position relative to the overlay so left/top are percentages of the tree area */
		position: absolute;
		top: -10px;
		width: 10px;
		height: 10px;
		border-radius: 100%;
		/* default names/timing will be overridden by inline styles per-flake */
		animation-name: snow, spin;
		animation-duration: 10s, 4s;
		animation-timing-function: linear, linear;
		animation-iteration-count: 1, infinite;
		animation-fill-mode: both, none;
		opacity: 0;
		transform-origin: center;
		pointer-events: none;
	}
	/* .snowflake:nth-child(odd) {
		animation-duration: 8s;
	}
	.snowflake:nth-child(even) {
		animation-duration: 12s;
	} */

	.lid {
		transition: transform 0.3s cubic-bezier(0.35, 0.15, 0.25, 1);
		will-change: transform;
	}
	.lidshadow {
		transition: transform 0.3s cubic-bezier(0.35, 0.15, 0.25, 1);
		will-change: transform;
	}
</style>
