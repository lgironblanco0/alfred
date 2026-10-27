import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LoginThrottle } from "../src/auth/loginThrottle.js";

function makeClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("límite de intentos de acceso", () => {
  it("permite cinco fallos y bloquea el intento siguiente", () => {
    const throttle = new LoginThrottle({ now: makeClock().now });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      throttle.assertAllowed("ip:codigo");
      throttle.recordFailure("ip:codigo");
    }

    assert.throws(
      () => throttle.assertAllowed("ip:codigo"),
      (error: unknown) =>
        error instanceof Error &&
        "status" in error &&
        (error as { status: number }).status === 429 &&
        (error as { code?: string }).code === "TOO_MANY_ATTEMPTS",
    );
  });

  it("no bloquea a claves distintas", () => {
    const throttle = new LoginThrottle({ now: makeClock().now });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      throttle.recordFailure("ip:uno");
    }

    assert.doesNotThrow(() => throttle.assertAllowed("ip:dos"));
    assert.doesNotThrow(() => throttle.assertAllowed("otra-ip:uno"));
  });

  it("vuelve a permitir el acceso al terminar la ventana", () => {
    const clock = makeClock();
    const throttle = new LoginThrottle({ now: clock.now, windowMs: 60_000 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      throttle.recordFailure("ip:codigo");
    }

    assert.throws(() => throttle.assertAllowed("ip:codigo"));

    clock.advance(60_000);

    assert.doesNotThrow(() => throttle.assertAllowed("ip:codigo"));
  });

  it("un login correcto limpia el contador", () => {
    const throttle = new LoginThrottle({ now: makeClock().now });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      throttle.recordFailure("ip:codigo");
    }

    throttle.reset("ip:codigo");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.doesNotThrow(() => throttle.assertAllowed("ip:codigo"));
      throttle.recordFailure("ip:codigo");
    }
  });

  it("descarta las claves caducadas y no crece sin control", () => {
    const clock = makeClock();
    const throttle = new LoginThrottle({ now: clock.now, windowMs: 1_000 });

    for (let index = 0; index < 20; index += 1) {
      throttle.recordFailure(`ip:${index}`);
    }

    assert.equal(throttle.size(), 20);

    clock.advance(1_000);
    throttle.prune();

    assert.equal(throttle.size(), 0);
  });
});
