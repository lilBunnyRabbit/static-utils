import * as objectHash from "object-hash";

export function ArrayProxy<T>(callback: (data: T[]) => void, data: T[] = []) {
  let lastMd5: string | undefined;

  return new Proxy(data, {
    set: function (target, property, value) {
      // @ts-ignore
      const isValid = Reflect.set(...arguments);
      if (!isValid) return isValid;

      /**
       * TODO: Not a perfect solution.
       * - For example `splice` is still triggered 3 times.
       */
      const md5 = objectHash(target, { algorithm: "md5" });
      if (!lastMd5 || md5 !== lastMd5) {
        console.log(`SET ["${String(property)}"] = "${value}"`);
        console.log(md5, target);

        lastMd5 = md5;
        callback(target);
      }

      return isValid;
    },
  });
}
