/**
 * A single "armed scenario" the next relevant mock-provider call will honor,
 * then immediately disarm (one-shot). This is what the TANKY Demo Control
 * Panel drives — it lets an operator steer a live demo transaction toward a
 * specific failure mode without any special-casing in the transaction
 * engine itself: the mocks are just a stand-in for real providers that would
 * occasionally decline, go offline, or time out.
 *
 * Only ever wired into Mock providers — real provider implementations have
 * no dependency on this class.
 */
export type DemoScenario =
  | "NONE"
  | "PAYMENT_AUTHORIZATION_FAILURE"
  | "PAYMENT_CAPTURE_FAILURE"
  | "PUMP_FAILURE"
  | "NETWORK_ERROR"
  | "FORCE_COMPLETE_FUELING";

export class DemoControlRegistry {
  private armed: DemoScenario = "NONE";

  arm(scenario: DemoScenario): void {
    this.armed = scenario;
  }

  current(): DemoScenario {
    return this.armed;
  }

  /** Consumes the armed scenario if it matches one of `relevantTo`; otherwise leaves it armed. */
  consumeIfRelevant(...relevantTo: DemoScenario[]): DemoScenario | null {
    if (this.armed !== "NONE" && relevantTo.includes(this.armed)) {
      const scenario = this.armed;
      this.armed = "NONE";
      return scenario;
    }
    return null;
  }

  reset(): void {
    this.armed = "NONE";
  }
}
