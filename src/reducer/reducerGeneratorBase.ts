import { ReducerPackage } from "../reducer";
import { Dispatchable } from "../reducer/common";
import { Dict } from "./utils";

export type ReduxActionCreators = Dict<Dispatchable>
export abstract class ReducerGeneratorBase<T, ActionCreators extends ReduxActionCreators>{
  protected abstract reducerPackage: ReducerPackage<T>;
  abstract extractActions(): ActionCreators;
  getReducerPackage(): ReducerPackage<T>{
    return this.reducerPackage;
  }
}

