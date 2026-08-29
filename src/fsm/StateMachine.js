export class BaseState {
  constructor(unit) {
    this.unit = unit;
  }

  enter(prevState, params) {}
  update(deltaTime) {}
  exit(nextState) {}
}

export class StateMachine {
  constructor(unit) {
    this.unit = unit;
    this.states = new Map();
    this.currentState = null;
    this.previousState = null;
    this.currentStateName = 'NONE';
  }

  addState(name, stateInstance) {
    this.states.set(name, stateInstance);
    return this;
  }

  changeState(name, params = {}) {
    if (!this.states.has(name)) {
      console.warn(`State '${name}' bulunamadi.`);
      return;
    }

    const nextState = this.states.get(name);
    if (this.currentState) {
      this.currentState.exit(name);
    }

    this.previousState = this.currentStateName;
    this.currentState = nextState;
    this.currentStateName = name;
    this.currentState.enter(this.previousState, params);
  }

  update(deltaTime) {
    if (this.currentState) {
      this.currentState.update(deltaTime);
    }
  }

  getStateName() {
    return this.currentStateName;
  }
}
