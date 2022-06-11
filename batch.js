function batch(original, instructions = []) {
    const f = () => { };
    f.original = original;
    f.instructions = instructions;
    return new Proxy(f, {
        get: (target, key) => {
            if (key === "__batch__value") {
                return { original, instructions };
            }
            return batch(target.original, [...target.instructions, { type: "index", prop: key }]);
        },
        apply: (target, thisArg, args) => {
            return batch(target.original, [...target.instructions, { type: "apply", args }]);
        },
    });
}
async function calculate(obj) {
    //@ts-ignore
    const val = obj.__batch__value;
    let last = null;
    let current = val.original;
    for (const i of val.instructions) {
        if (i.type === "index") {
            last = current;
            current = current[i.prop];
        }
        else if (i.type === "apply") {
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
