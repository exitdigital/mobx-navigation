import { computed, observable } from 'mobx';
import Log from '../Logger';

export default class NavNode {
  // Back reference to root object
  navState: NavState;

  previous: NavNode;
  @observable _next: NavNode;

  element: NavElement;

  // Created by scenes to reconcile identical content to be shared across nav nodes
  _hint: string = null;

  get next() {
    return this._next;
  }

  set next(newNext: NavNode) {
    // First, determine if this node is truly the one we intend on inserting newNext after.
    // In the event that the new node is marked "unique," we must search the current stack to ensure
    // that exactly one instance of it exists at a time.
    let current = this;
    if (newNext && newNext.isUnique) {
      const prev = current;
      while (prev) {
        if (prev.component === newNext.component) {
          current = prev.previous;
          break;
        }
        prev = prev.previous;
      }
    }

    // All nodes after this one must be orphaned
    let nextNode = current._next;
    while (nextNode) {
      this.navState.elementPool.release(nextNode);
      nextNode = nextNode._next;
    }
    current._next = newNext;
    if (newNext) {
      newNext.previous = current;
    }
  }

  @observable component;
  config;
  @observable props;

  get wrappedComponent() {
    // Returns the wrapped component if it exists, and just the component if not
    return this.component.wrappedComponent || this.component;
  }

  get hint() {
    if (this._hint) {
      return this._hint;
    }

    // Unlike other configuration values, the cache hint cannot be part of any template or default configuration
    if (this.config) {
      const cacheHintType = typeof this.config.cacheHint;
      if (cacheHintType === 'function') {
        this._hint = this.config.cacheHint(this.props);
      } else if (cacheHintType === 'string') {
        this._hint = this.config.cacheHint;
      } else if (cacheHintType !== 'undefined') {
        Log.error(`Invalid cache hint type of ${cacheHintType} supplied to ${this.sceneKey}`);
      }
    }

    return this._hint;
  }

  get isUnique() {
    return this.config.unique;
  }

  // If this scene is used as the root of a tab, the configuration governing the tab are housed here
  @observable tabConfig;

  constructor(navState, scene, props = {}) {
    this.navState = navState;
    this.component = scene.target;
    this.config = scene.config;
    this.sceneKey = scene.sceneKey;
    this.props = props;
    this.element = navState.elementPool.retain(this);
  }

  @computed get tail() {
    if (!this.next) {
      return this;
    }

    return this.next.tail;
  }
}
