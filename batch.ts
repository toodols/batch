type ValueOrPromise<V> = V | Promise<V>;

type Batcher<T> = T extends object ? {
	[K in keyof T]: T[K] extends (...args: any[]) => ValueOrPromise<infer T>
		? () => Batcher<T>
		: Batcher<T[K]>;
} : T

type Instruction = { type: "index"; prop: string } | { type: "apply"; args: any[] };

function batch<T>(original: T, instructions: Instruction[] = []): Batcher<T> {
	const f = () => {};
	f.original = original;
	f.instructions = instructions;
	return new Proxy(f, {
		get: (target, key) => {
			if (key === "__batch__value") {
				return { original, instructions };
			}
			return batch(target.original, [...target.instructions, { type: "index", prop: key as string }]);
		},
		apply: (target, thisArg, args) => {
			return batch(target.original, [...target.instructions, { type: "apply", args }]);
		},
	}) as unknown as Batcher<T>;
}

async function calculate<T>(obj: Batcher<T>) {
	//@ts-ignore
	const val = obj.__batch__value as { original: T; instructions: Instruction[] };
	let last: any = null;
	let current = val.original;
	for (const i of val.instructions) {
		if (i.type === "index") {
			last = current;
			current = current[i.prop];
		} else if (i.type === "apply") {
			//@ts-ignore
			current = await current.apply(last, i.args);
		}
	}
	return await current;
}

class Thing2 {
	async foo() {
		return 123;
	}
	async a() {
		return new Thing();
	}
}
class Thing {
	async get() {
		return new Thing2();
	}
}


let v = calculate(batch(new Thing()).get().foo().toExponential());
v.then(console.log);
